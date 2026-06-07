mod core;
mod network;
mod query;

use anyhow::{Context, Result};
use clap::Parser;
use dotenvy::dotenv;
use snarkvm::prelude::{PrivateKey, Program, TestRng, TestnetV0};
use std::{env, fs, str::FromStr};

use crate::{
    core::Engine,
    network::{
        broadcast_transaction, build_client, fetch_program, fetch_state_root, wait_for_confirmation,
    },
    query::FixedStateRootQuery,
};

const DEV_PRIVATE_KEY: &str = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";

#[derive(Parser)]
#[command(
    name = "aleo-private-vote-client",
    about = "Execute Aleo Private Vote with snarkVM"
)]
struct Cli {
    #[arg(long, default_value = "private_vote.aleo")]
    program: String,

    #[arg(long, default_value = "main")]
    function: String,

    #[arg(long, default_value = "3u64,2u64")]
    inputs: String,

    #[arg(long, default_value = "../leo/private_vote/build/main.aleo")]
    local_program: String,

    #[arg(long, default_value_t = 100_000)]
    priority_fee: u64,

    #[arg(
        long,
        env = "NODE_URL",
        default_value = "https://api.provable.com/v2/testnet"
    )]
    node_url: String,

    #[arg(long)]
    dry_run: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    let cli = Cli::parse();
    let inputs: Vec<&str> = cli
        .inputs
        .split(',')
        .map(str::trim)
        .filter(|input| !input.is_empty())
        .collect();

    if inputs.is_empty() {
        anyhow::bail!("at least one input is required");
    }

    println!("\nAleo Private Vote Rust Client");
    println!("Program:  {}", cli.program);
    println!("Function: {}", cli.function);
    println!("Inputs:   {:?}", inputs);
    println!(
        "Mode:     {}",
        if cli.dry_run {
            "local dry-run"
        } else {
            "testnet broadcast"
        }
    );

    let private_key = read_private_key(cli.dry_run)?;
    let client = build_client()?;
    let program = if cli.dry_run {
        read_local_program(&cli.local_program)?
    } else {
        fetch_program(&client, &cli.node_url, &cli.program).await?
    };

    println!("Program loaded: {}", program.id());

    let mut engine = Engine::init(&program)?;
    let mut rng = TestRng::default();
    let program_id = program.id();
    let (response, trace) =
        engine.authorize_and_execute(&private_key, program_id, &cli.function, inputs, &mut rng)?;

    if cli.dry_run {
        println!("Dry-run outputs:");
        for (index, output) in response.outputs().iter().enumerate() {
            println!("  [{index}] {output}");
        }
        return Ok(());
    }

    let (state_root, block_height) = fetch_state_root(&client, &cli.node_url).await?;
    let query = FixedStateRootQuery::<TestnetV0> {
        state_root,
        block_height,
    };
    let transaction = engine.prove_and_package(
        trace,
        &private_key,
        program_id,
        &cli.function,
        1_327,
        cli.priority_fee,
        &query,
        &mut rng,
    )?;

    println!("Transaction ID: {}", transaction.id());

    let response = broadcast_transaction(&client, &cli.node_url, transaction.to_string()).await?;
    println!("Broadcast accepted: {response}");

    wait_for_confirmation(&client, &cli.node_url, &transaction.id().to_string()).await;
    Ok(())
}

fn read_private_key(dry_run: bool) -> Result<PrivateKey<TestnetV0>> {
    match env::var("PRIVATE_KEY") {
        Ok(private_key) => {
            PrivateKey::<TestnetV0>::from_str(&private_key).context("failed to parse PRIVATE_KEY")
        }
        Err(env::VarError::NotPresent) if dry_run => {
            PrivateKey::<TestnetV0>::from_str(DEV_PRIVATE_KEY)
                .context("failed to parse dev private key")
        }
        Err(error) => Err(error).context("PRIVATE_KEY is required for testnet broadcast"),
    }
}

fn read_local_program(path: &str) -> Result<Program<TestnetV0>> {
    let source = fs::read_to_string(path)
        .with_context(|| format!("failed to read local program at {path}"))?;
    Program::<TestnetV0>::from_str(&source).context("failed to parse local Aleo program")
}
