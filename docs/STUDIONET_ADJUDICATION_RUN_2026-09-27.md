# Studionet intelligent-adjudication run — 2026-09-27

The Phase 3 ProofPay contract was manually deployed and tested successfully on
GenLayer Studionet. The run exercised public-evidence adjudication and the
rejection/resubmission path described in `STUDIO_MANUAL_ADJUDICATION.md`.

| Action | Reference |
| --- | --- |
| Phase 3 ProofPay deployment | Contract `0xa1c53F5afFF44136d63dDF02dFDfA0ecEcFF32b7` |
| Deployment transaction | `0xc8a788bdb63db272b7102a730bf80294b4cbe141269c68bf7e9709fc1f311141` |
| Bounty 1 creation | `0x9c0f5eb0f16499069db20351e50607538e85f2a948faf363b4b8d2db58db0685` |
| Tunde proof submission | `0xbce9e4d4c515feadfc25cfadb6e74a59789fa23718c129aa651d0b64d6d1ae2f` |
| Tunde adjudication | `0x499f860918ffe205532c475a358c6c4b975b2c157d0d8f8c0a299c96d455ea46` |
| Bounty 2 creation | `0x28c12e19bed80a59e31707fbe9dfed1ccfccf37778bbe6b94eaa3dcc9defbd13` |
| Mei proof submission 2 | `0x005e9968c76317e7faf28003f69da07a9904a924b02f9a0d1744f1251ababd2a` |
| Mei adjudication 2 | `0x55ce4aca0c7257b628a1382b9ff6172dd47c36b910abbe680a0e51da218e5213` |
| Mei corrected proof submission 3 | `0xefbec5d8b4e4c6c30970e54f3b4f6fe451a5539b0b71638e52076db42bf9f21d` |
| Mei adjudication 3 | `0x2d1e9418dac9c6e71ed30d7a65065c291cf6339076ea99351f02bc37735eb9fa` |

Outcome: all transactions executed successfully as expected. This validates
deployment, funded bounty creation, evidence submission, live intelligent
adjudication, rejection, resubmission, and settlement behavior for the Phase 3
contract implementation.

