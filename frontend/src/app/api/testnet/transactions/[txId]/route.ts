import { NextResponse } from "next/server";
import { parseTestnetTransaction, type TestnetTransactionStatusResponse } from "@/transactionStatus";

const defaultNodeUrl = "https://api.provable.com/v2/testnet";
const transactionIdPattern = /^at1[0-9a-z]{20,}$/;

function statusResponse(response: Omit<TestnetTransactionStatusResponse, "checkedAt">, init?: ResponseInit) {
  return NextResponse.json(
    {
      ...response,
      checkedAt: new Date().toISOString()
    },
    init
  );
}

export async function GET(_request: Request, context: { params: Promise<{ txId: string }> }) {
  const { txId } = await context.params;

  if (!transactionIdPattern.test(txId)) {
    return statusResponse(
      {
        txId,
        status: "unavailable",
        message: "Invalid Aleo transaction id."
      },
      { status: 400 }
    );
  }

  const nodeUrl = process.env.ALEO_TESTNET_API_URL ?? defaultNodeUrl;

  try {
    const upstream = await fetch(`${nodeUrl}/transaction/${txId}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*"
      }
    });

    if (upstream.status === 404) {
      return statusResponse({
        txId,
        status: "pending",
        message: "The transaction has not been indexed by the testnet API yet."
      });
    }

    if (!upstream.ok) {
      return statusResponse({
        txId,
        status: "unavailable",
        message: `Testnet API returned ${upstream.status}.`
      });
    }

    const payload = (await upstream.json()) as unknown;

    return statusResponse({
      txId,
      status: "accepted",
      message: "The transaction is available from the testnet API.",
      ...parseTestnetTransaction(payload)
    });
  } catch (error) {
    return statusResponse({
      txId,
      status: "unavailable",
      message: error instanceof Error ? error.message : "Unable to query the testnet API."
    });
  }
}
