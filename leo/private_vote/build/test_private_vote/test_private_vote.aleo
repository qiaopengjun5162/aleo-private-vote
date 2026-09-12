import private_vote.aleo;
program test_private_vote.aleo;

function test_majority_agree:
    call private_vote.aleo/main 3u64 2u64 into r0;
    assert.eq r0 true;

function test_tie_counts_as_agree:
    call private_vote.aleo/main 2u64 2u64 into r0;
    assert.eq r0 true;

function test_disagree_majority_fails:
    call private_vote.aleo/main 1u64 2u64 into r0;
    assert.eq r0 true;

constructor:
    assert.eq edition 0u16;
