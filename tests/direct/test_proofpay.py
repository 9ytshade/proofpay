from datetime import datetime, timedelta, timezone


CONTRACT = "contracts/proofpay.py"
BRIEF = "Build a responsive waitlist landing page from the supplied product brief."
CRITERIA = "Responsive on mobile\nEmail form submits successfully\nPublic deployment matches the brief"


def future_timestamp(days: int = 7) -> int:
    return int((datetime.now(timezone.utc) + timedelta(days=days)).timestamp())


def create_bounty(direct_vm, contract, client, reward=10_000, title="Waitlist site"):
    direct_vm.sender = client
    direct_vm.value = reward
    bounty_id = contract.create_bounty(title, BRIEF, CRITERIA, future_timestamp())
    direct_vm.value = 0
    return bounty_id


def deploy_contract(direct_deploy):
    return direct_deploy(CONTRACT)


def test_client_can_create_multiple_funded_bounties(
    direct_vm, direct_deploy, direct_alice
):
    contract = deploy_contract(direct_deploy)
    first = create_bounty(direct_vm, contract, direct_alice, 10_000, "Landing page")
    second = create_bounty(direct_vm, contract, direct_alice, 20_000, "Documentation site")

    assert first == 1
    assert second == 2
    assert contract.get_bounty(first)["reward"] == 10_000
    assert contract.get_bounty(second)["reward"] == 20_000
    assert contract.get_bounty(second)["status"] == "open"


def test_multiple_clients_own_independent_bounties(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    alice_bounty = create_bounty(direct_vm, contract, direct_alice)
    bob_bounty = create_bounty(direct_vm, contract, direct_bob)

    assert contract.get_bounty(alice_bounty)["client"].as_bytes == direct_alice
    assert contract.get_bounty(bob_bounty)["client"].as_bytes == direct_bob


def test_create_requires_funding(direct_vm, direct_deploy, direct_alice):
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 0

    with direct_vm.expect_revert("Bounty reward must be greater than zero"):
        contract.create_bounty("Unfunded", BRIEF, CRITERIA, future_timestamp())


def test_create_limits_criteria_to_five_items(direct_vm, direct_deploy, direct_alice):
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 10_000
    six_items = "\n".join([f"Criterion number {number}" for number in range(1, 7)])

    with direct_vm.expect_revert("Provide between one and five criteria"):
        contract.create_bounty("Too many criteria", BRIEF, six_items, future_timestamp())


def test_multiple_builders_can_submit_to_one_bounty(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = deploy_contract(direct_deploy)
    bounty_id = create_bounty(direct_vm, contract, direct_alice)

    direct_vm.sender = direct_bob
    first = contract.submit_proof(
        bounty_id,
        "https://github.com/bob/waitlist",
        "https://bob-waitlist.example.com/",
        "Implemented the landing page and a working email capture form.",
    )
    direct_vm.sender = direct_charlie
    second = contract.submit_proof(
        bounty_id,
        "https://github.com/charlie/waitlist",
        "https://charlie-waitlist.example.com/",
        "Implemented the requested responsive landing page and deployment.",
    )

    assert first == 1
    assert second == 2
    assert contract.get_bounty(bounty_id)["submission_count"] == 2
    assert contract.get_submission(bounty_id, second)["builder"].as_bytes == direct_charlie


def test_client_cannot_submit_to_own_bounty(
    direct_vm, direct_deploy, direct_alice
):
    contract = deploy_contract(direct_deploy)
    bounty_id = create_bounty(direct_vm, contract, direct_alice)

    with direct_vm.expect_revert("Client cannot submit to own bounty"):
        contract.submit_proof(
            bounty_id,
            "https://github.com/alice/waitlist",
            "https://alice-waitlist.example.com/",
            "This summary is long enough to be valid proof text.",
        )


def test_submission_requires_github_and_https(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    bounty_id = create_bounty(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("Repository URL must be a public GitHub URL"):
        contract.submit_proof(
            bounty_id,
            "https://gitlab.com/bob/waitlist",
            "https://bob-waitlist.example.com/",
            "This summary is long enough to be valid proof text.",
        )

    with direct_vm.expect_revert("Deployment URL must use HTTPS"):
        contract.submit_proof(
            bounty_id,
            "https://github.com/bob/waitlist",
            "http://bob-waitlist.example.com/",
            "This summary is long enough to be valid proof text.",
        )


def test_submission_after_deadline_is_rejected(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    bounty_id = create_bounty(direct_vm, contract, direct_alice)
    direct_vm.warp((datetime.now(timezone.utc) + timedelta(days=8)).isoformat())
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("Bounty deadline has passed"):
        contract.submit_proof(
            bounty_id,
            "https://github.com/bob/waitlist",
            "https://bob-waitlist.example.com/",
            "This summary is long enough to be valid proof text.",
        )


def test_client_can_cancel_only_before_any_submission(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    cancellable = create_bounty(direct_vm, contract, direct_alice)
    contract.cancel_bounty(cancellable)
    assert contract.get_bounty(cancellable)["status"] == "cancelled"

    blocked = create_bounty(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_bob
    contract.submit_proof(
        blocked,
        "https://github.com/bob/waitlist",
        "https://bob-waitlist.example.com/",
        "This summary is long enough to be valid proof text.",
    )
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Bounty with submissions cannot be cancelled"):
        contract.cancel_bounty(blocked)


def test_only_client_can_cancel(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    bounty_id = create_bounty(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("Only the client can cancel this bounty"):
        contract.cancel_bounty(bounty_id)


def test_client_can_refund_after_review_window(
    direct_vm, direct_deploy, direct_alice
):
    contract = deploy_contract(direct_deploy)
    bounty_id = create_bounty(direct_vm, contract, direct_alice)
    direct_vm.warp((datetime.now(timezone.utc) + timedelta(days=15)).isoformat())

    contract.refund_expired_bounty(bounty_id)
    assert contract.get_bounty(bounty_id)["status"] == "refunded"


def test_approved_evidence_pays_the_builder_after_adjudication(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    bounty_id = create_bounty(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_bob
    submission_id = contract.submit_proof(
        bounty_id,
        "https://github.com/bob/waitlist",
        "https://bob-waitlist.example.com/",
        "Implemented the responsive landing page and working email form.",
    )
    direct_vm.mock_web(
        r"github\.com/bob/waitlist",
        {"status": 200, "body": "Public source for the responsive waitlist page."},
    )
    direct_vm.mock_web(
        r"bob-waitlist\.example\.com",
        {"status": 200, "body": "Waitlist landing page with a working email form."},
    )
    direct_vm.mock_llm(
        r"funded public web-development bounty",
        '{"approved": true, "required_criteria_passed": true, "score": 91, "criteria_report": "Responsive: passed. Form: passed. Deployment: passed.", "reason": "The public repository and deployment demonstrate all required work."}',
    )

    verdict = contract.adjudicate_submission(bounty_id, submission_id)

    assert verdict["approved"] is True
    assert contract.get_bounty(bounty_id)["status"] == "awarded"
    assert contract.get_bounty(bounty_id)["approved_submission_id"] == 1
    submission = contract.get_submission(bounty_id, submission_id)
    assert submission["status"] == "approved"
    assert submission["score"] == 91
    assert contract.get_verdict(submission["verdict_id"])["approved"] is True


def test_rejected_evidence_keeps_bounty_open_for_other_builders(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = deploy_contract(direct_deploy)
    bounty_id = create_bounty(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_bob
    rejected_submission = contract.submit_proof(
        bounty_id,
        "https://github.com/bob/incomplete-waitlist",
        "https://bob-incomplete.example.com/",
        "Submitted a partial implementation for review and feedback.",
    )
    direct_vm.mock_web(
        r"github\.com/bob/incomplete-waitlist",
        {"status": 200, "body": "A partial repository without a form implementation."},
    )
    direct_vm.mock_web(
        r"bob-incomplete\.example\.com",
        {"status": 200, "body": "A page that is missing the requested form."},
    )
    direct_vm.mock_llm(
        r"funded public web-development bounty",
        '{"approved": false, "required_criteria_passed": false, "score": 45, "criteria_report": "Responsive: uncertain. Form: failed. Deployment: partial.", "reason": "The deployed page does not demonstrate a working email form."}',
    )

    verdict = contract.adjudicate_submission(bounty_id, rejected_submission)

    assert verdict["approved"] is False
    assert contract.get_bounty(bounty_id)["status"] == "open"
    assert contract.get_submission(bounty_id, rejected_submission)["status"] == "rejected"

    direct_vm.sender = direct_charlie
    next_submission = contract.submit_proof(
        bounty_id,
        "https://github.com/charlie/waitlist",
        "https://charlie-waitlist.example.com/",
        "Submitted a complete alternative implementation with public proof.",
    )
    assert next_submission == 2


def test_inconsistent_adjudicator_verdict_is_rejected(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    bounty_id = create_bounty(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_bob
    submission_id = contract.submit_proof(
        bounty_id,
        "https://github.com/bob/waitlist",
        "https://bob-waitlist.example.com/",
        "Implemented the responsive landing page and working email form.",
    )
    direct_vm.mock_web(r"github\.com/bob/waitlist", {"status": 200, "body": "Source."})
    direct_vm.mock_web(r"bob-waitlist\.example\.com", {"status": 200, "body": "Site."})
    direct_vm.mock_llm(
        r"funded public web-development bounty",
        '{"approved": true, "required_criteria_passed": false, "score": 90, "criteria_report": "Bad output.", "reason": "Bad output."}',
    )

    with direct_vm.expect_revert("Adjudicator returned inconsistent verdict"):
        contract.adjudicate_submission(bounty_id, submission_id)
