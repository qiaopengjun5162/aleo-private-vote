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

    @noupgrade
    constructor() {}
}
