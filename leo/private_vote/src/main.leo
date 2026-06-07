struct ProposalInfo {
    title: field,
    content: field,
    proposer: address,
}

program private_vote.aleo {
    record Proposal {
        owner: address,
        id: field,
        info: ProposalInfo,
    }

    record Ticket {
        owner: address,
        proposal_id: field,
    }

    mapping proposals: field => ProposalInfo;
    mapping tickets: field => u64;
    mapping agree_votes: field => u64;
    mapping disagree_votes: field => u64;

    @noupgrade
    constructor() {}

    // Keeps the demo cheap to prove while the record functions model the private ticket flow.
    fn main(public agree_count: u64, public disagree_count: u64) -> bool {
        return agree_count >= disagree_count;
    }

    fn propose(public info: ProposalInfo) -> (Proposal, Final) {
        assert_eq(self.caller, info.proposer);

        let id: field = BHP256::hash_to_field(info.title);

        let proposal: Proposal = Proposal {
            owner: info.proposer,
            id: id,
            info: info,
        };

        return (proposal, final {
            proposals.set(id, info);
            tickets.set(id, 0u64);
            agree_votes.set(id, 0u64);
            disagree_votes.set(id, 0u64);
        });
    }

    fn new_ticket(public proposal_id: field, voter: address) -> (Ticket, Final) {
        let ticket: Ticket = Ticket {
            owner: voter,
            proposal_id: proposal_id,
        };

        return (ticket, final {
            let current: u64 = tickets.get_or_use(proposal_id, 0u64);
            tickets.set(proposal_id, current + 1u64);
        });
    }

    fn agree(ticket: Ticket) -> Final {
        let proposal_id: field = ticket.proposal_id;

        return final {
            let current: u64 = agree_votes.get_or_use(proposal_id, 0u64);
            agree_votes.set(proposal_id, current + 1u64);
        };
    }

    fn disagree(ticket: Ticket) -> Final {
        let proposal_id: field = ticket.proposal_id;

        return final {
            let current: u64 = disagree_votes.get_or_use(proposal_id, 0u64);
            disagree_votes.set(proposal_id, current + 1u64);
        };
    }
}
