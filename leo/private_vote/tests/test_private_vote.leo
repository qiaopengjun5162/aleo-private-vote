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

// --- script tests for propose / new_ticket / agree / disagree ---
// These require Leo >= 4.4 which supports the `script` test keyword.
// On Leo 4.0.2 these are ignored; on 4.4+ they run via `leo test`.

@test
script test_propose_creates() {
    let caller: address = self.signer;
    let info: private_vote.aleo::ProposalInfo = private_vote.aleo::ProposalInfo {
        title: 42field,
        content: 100field,
        proposer: caller,
    };
    let result: (private_vote.aleo::Proposal, Final) = private_vote.aleo::propose(info);
    let proposal: private_vote.aleo::Proposal = result.0;
    let fin: Final = result.1;
    fin.run();
    assert_eq(proposal.owner, caller);
}

@test
@should_fail
script test_propose_wrong_proposer() {
    let info: private_vote.aleo::ProposalInfo = private_vote.aleo::ProposalInfo {
        title: 99field,
        content: 0field,
        proposer: aleo1lqkc6r53r3dym3cdhvfjhc64f6mvuupamuxq6hfd278qnal5yq9qukw6x7,
    };
    let result: (private_vote.aleo::Proposal, Final) = private_vote.aleo::propose(info);
    let fin: Final = result.1;
    fin.run();
}

@test
script test_new_ticket_works() {
    let voter: address = self.signer;
    let proposal_id: field = 777field;
    let result: (private_vote.aleo::Ticket, Final) = private_vote.aleo::new_ticket(proposal_id, voter);
    let ticket: private_vote.aleo::Ticket = result.0;
    let fin: Final = result.1;
    fin.run();
    assert_eq(ticket.owner, voter);
    assert_eq(ticket.proposal_id, proposal_id);
}

@test
script test_agree_vote() {
    let voter: address = self.signer;
    let proposal_id: field = 888field;
    let ticket_result: (private_vote.aleo::Ticket, Final) = private_vote.aleo::new_ticket(proposal_id, voter);
    let ticket: private_vote.aleo::Ticket = ticket_result.0;
    let ticket_fin: Final = ticket_result.1;
    ticket_fin.run();
    let agree_fin: Final = private_vote.aleo::agree(ticket);
    agree_fin.run();
}

@test
script test_disagree_vote() {
    let voter: address = self.signer;
    let proposal_id: field = 999field;
    let ticket_result: (private_vote.aleo::Ticket, Final) = private_vote.aleo::new_ticket(proposal_id, voter);
    let ticket: private_vote.aleo::Ticket = ticket_result.0;
    let ticket_fin: Final = ticket_result.1;
    ticket_fin.run();
    let disagree_fin: Final = private_vote.aleo::disagree(ticket);
    disagree_fin.run();
}

@test
script test_full_voting_flow() {
    let proposer: address = self.signer;
    let info: private_vote.aleo::ProposalInfo = private_vote.aleo::ProposalInfo {
        title: 1234field,
        content: 5678field,
        proposer: proposer,
    };

    // 1. 创建提案
    let propose_result: (private_vote.aleo::Proposal, Final) = private_vote.aleo::propose(info);
    let proposal: private_vote.aleo::Proposal = propose_result.0;
    let propose_fin: Final = propose_result.1;
    propose_fin.run();

    // 2. 签发投票票据
    let ticket_result: (private_vote.aleo::Ticket, Final) = private_vote.aleo::new_ticket(proposal.id, proposer);
    let ticket: private_vote.aleo::Ticket = ticket_result.0;
    let ticket_fin: Final = ticket_result.1;
    ticket_fin.run();

    // 3. 投赞成票
    let agree_fin: Final = private_vote.aleo::agree(ticket);
    agree_fin.run();

    // 4. 验证 main 判定结果（1 赞成 vs 0 反对 → 通过）
    let outcome: bool = private_vote.aleo::main(1u64, 0u64);
    assert_eq(outcome, true);
}
