import private_vote.aleo;

program test_private_vote.aleo {

    @test
    fn test_majority_agree() {
        let result: bool = private_vote.aleo::main(3u64, 2u64);
        assert_eq(result, true);
    }

    @test
    fn test_tie_counts_as_agree() {
        let result: bool = private_vote.aleo::main(2u64, 2u64);
        assert_eq(result, true);
    }

    @test
    @should_fail
    fn test_disagree_majority_fails() {
        let result: bool = private_vote.aleo::main(1u64, 2u64);
        assert_eq(result, true);
    }

    // Full voting flow (propose / new_ticket / agree / disagree) is verified
    // via testnet execution, not unit tests. Leo 4.4.2 has a compiler issue
    // where @test fn calling Final-returning functions triggers a false
    // "must contain a finalize block" error (docs say @test fn supports Final).
    // See on-chain evidence in README.md → Testnet Deployment.

    @noupgrade
    constructor() {}
}
