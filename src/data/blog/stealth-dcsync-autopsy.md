---
title: "Stealth DCSync, an autopsy: no flag combination got me usable secrets without Get-Changes-All"
pubDatetime: 2026-08-02T20:00:00Z
description: "I tested five MS-DRSR flag and EXOP manipulations meant to perform a DCSync without triggering the DS-Replication-Get-Changes-All GUID in Event 4662. Every variant that returned usable credential material also logged the GUID, identically on Server 2016 and Server 2025. One variant contradicts the MS-DRSR specification and I could not resolve it."
tags: ["active-directory", "red-team", "detection-engineering", "impacket"]
hideEditPost: true
---

**Summary.** Every SIEM rule for DCSync keys on Event 4662 carrying the GUID `1131f6ad-9c07-11d1-f79f-00c04fc2dcd2` (DS-Replication-Get-Changes-All). I wanted to know if manipulating the MS-DRSR request itself, through `ulFlags`, `ulExtendedOp`, or a filtered-set-only account, could pull credential material without that GUID appearing. I ran five request variants against a Server 2016 DC and repeated them against a Server 2025 DC (build 26100). Four returned the correct NT hash and all four logged `1131f6ad`, identically on both versions. The fifth, using `DRS_SPECIAL_SECRET_PROCESSING`, returned no usable secret at all — which is what [MS-DRSR] says should happen — yet still produced the GUID, and I could not determine why. So the claim I will defend is narrow: **of the request-shaping paths that actually yield credential material, none avoided the Get-Changes-All check or its telemetry.** The permission path is closed too: a delegated account holding only Get-Changes-In-Filtered-Set gets ACCESS_DENIED when it asks for secrets, and the filtered right is never evaluated. Detection rules targeting that GUID hold.

## The idea

DCSync is one of the most reliably detected Active Directory attacks. The detection works because the DC logs an Event 4662 for every replication permission it verifies during a DRS request, and pulling password material always seems to require DS-Replication-Get-Changes-All (`1131f6ad`). Every detection rule I know of treats that GUID as the cornerstone.

The protocol, though, offers knobs that look promising. MS-DRSR supports `pPartialAttrSet`, a filtered list of attributes to replicate, and there is a separate extended right, DS-Replication-Get-Changes-In-Filtered-Set (`89e95b76`), that Azure AD Connect uses legitimately every day. There are also request flags like `DRS_WRIT_REP` and `DRS_SPECIAL_SECRET_PROCESSING`, plus two different extended operation codes, `EXOP_REPL_OBJ` and `EXOP_REPL_SECRETS`. Somewhere in that matrix, maybe a combination asks for secrets in a way that doesn't trip the Get-Changes-All check.

No published research maps those knobs to the GUIDs that end up in Event 4662. All four DCSync-capable tools I checked (Mimikatz, impacket secretsdump, DSInternals, SharpDCSync) send the same flag pattern. So I tested it. This post is not a new technique. It is the autopsy of an idea that fails, and the failure tells you something useful about how the DC actually decides what to check.

## The matrix I tested

Three dimensions, five request variants:

| # | Variant | `ulFlags` | `ulExtendedOp` |
|---|---|---|---|
| V1 | Baseline | `INIT_SYNC \| WRIT_REP` (0x30) | `EXOP_REPL_OBJ` (6) |
| V2 | No WRIT_REP | `INIT_SYNC` (0x20) | `EXOP_REPL_OBJ` (6) |
| V3 | Special secret processing | `INIT_SYNC \| SPECIAL_SECRET_PROCESSING` (0x04000020) | `EXOP_REPL_OBJ` (6) |
| V4 | REPL_SECRETS, no WRIT_REP | `INIT_SYNC` (0x20) | `EXOP_REPL_SECRETS` (7) |
| V5 | Full baseline + REPL_SECRETS | `INIT_SYNC \| WRIT_REP` (0x30) | `EXOP_REPL_SECRETS` (7) |

My working assumption was that the Get-Changes-All check is triggered by `DRS_WRIT_REP`, the flag that marks the destination as a writeable replica. Remove it, or reroute the request through `EXOP_REPL_SECRETS` or `DRS_SPECIAL_SECRET_PROCESSING`, and maybe the DC downgrades the permission it verifies to something quieter.

## Lab

Two forests, nine years of releases apart:

- **Server 2016 DC** (DetectionLab on Proxmox), domain `WINDOMAIN`, functional level Windows2016Forest.
- **Server 2025 Standard Evaluation DC**, build 26100, functional level Windows2025Forest, in its own forest `windomain2025.local` so nothing from the 2016 lab leaks into the comparison.

Test client runs impacket 0.13.1. Every offensive run in the variant matrix uses the built-in Administrator account of each forest, a Domain Admin. That scoping matters: the delegated-account work described below went through three failed rounds caused by a mistake of my own before it produced clean data, and the matrix was never exposed to that problem. The harness monkey-patches `secretsdump.py` at the two lines that build the request (lines 646 and 649 in this release):

```python
request['pmsgIn']['V8']['ulFlags'] = drsuapi.DRS_INIT_SYNC | drsuapi.DRS_WRIT_REP
request['pmsgIn']['V8']['ulExtendedOp'] = drsuapi.EXOP_REPL_OBJ
```

After each run I pulled the Security log from the DC with `wevtutil` filtered on Event 4662 and the execution timestamp. One thing that matters for the comparison to mean anything: auditing parity. Event 4662 only fires if Audit Directory Service Access is enabled and the domain root carries a SACL auditing property reads. I verified both DCs produce a `1131f6ad` event for a plain baseline DCSync before running any variant. The full command-by-command logs and the variant tester scripts ship in a [companion repo](https://github.com/JVBotelho/dcsync-variant-tester); every number below is reproducible from them.

## Five variants, one GUID

Four of five returned the correct NT hash for the test user on both DCs. V3, with `DRS_SPECIAL_SECRET_PROCESSING`, returned `31d6cfe0d16ae931b73c59d7e0c089c0` — the NT hash of an empty password — and that is the specified behavior, not a failure. [MS-DRSR] 4.1.10.5.8 `AddObjToResponse` is explicit:

```
if AmILHServer() and DRS_SPECIAL_SECRET_PROCESSING in ulFlags and
    IsSecretAttribute(attribute) then
   /* secret attribute, send a null value */
```

The DC deliberately sent nothing, and impacket hashed the absence. V3 did not succeed as an attack; it is the protocol working as designed. Same on 2016 and 2025.

One loose end I am recording rather than resolving: this holds for the minimal two-attribute set the harness sends. My 2016 notes record V3 returning the *correct* hash when impacket's full ten-attribute set is used, which the specification does not predict — `IsRevealSecretRequest` short-circuits on the flag before it ever inspects the attribute set. Either that observation is wrong or something else is going on, and I have not re-run it.

And every variant produced the same telemetry. V2, with no `DRS_WRIT_REP`, generated this on the 2025 DC:

```
Event: {1131f6ad-9c07-11d1-f79f-00c04fc2dcd2}  <- Get-Changes-All
Event: {1131f6aa-9c07-11d1-f79f-00c04fc2dcd2}  <- Get-Changes
Event: {1131f6aa-9c07-11d1-f79f-00c04fc2dcd2}  <- Get-Changes
```

V1, V3, V4, and V5 produced byte-identical GUID sets. No variant ever emitted `89e95b76` (Get-Changes-In-Filtered-Set). The five runs on the 2025 DC executed in a scripted sequence, about 1.4 seconds total, each with a distinct LogonID (`0x300106` through `0x3022E0`), so each event set is attributable to exactly one variant with no cross-contamination.

The assumption was wrong. `DRS_WRIT_REP` is a protocol behavior flag; it tells the DC what kind of replica you claim to be. It is not what drives the authorization decision.

## Dimension C: three rounds of chasing my own mistake

The plan for the permission dimension was simple. A delegated account holding Get-Changes + Get-Changes-All on the domain NC should DCSync without any admin membership; that is the documented persistence technique, and BloodHound's DCSync edge is computed from exactly that pair. A filtered-set-only account would then show what the `89e95b76` path produces when it asks for secrets.

It took three test rounds to get there, and the failure is worth documenting because it is embarrassingly instructive. Every delegated attempt failed with `ERROR_DS_DRA_BAD_DN (0x20f7)`, across three tools (impacket, NetExec, Mimikatz), two auth methods (NTLM, Kerberos), and both forests. Granting Generic All on the NC root did not help. Adding the account to Administrators "fixed" it. For a while this looked like undocumented DC behavior contradicting a decade of tradecraft.

The root cause was one flag in my own `dsacls` command. Every grant used `/I:S`, which creates an **inherit-only ACE**: it applies to child objects, never to the domain head object where the DC checks replication rights. Administrators worked because they hold effective rights on the head by default, independent of my ACE. My audit had verified the ACEs existed; I never checked their *scope* (`InheritanceType: Descendents`, `PropagationFlags: InheritOnly`). One extra column in that PowerShell query would have ended this in the first round. And `0x20f7` turned out to be what an account with no effective replication rights on the NC head gets, not the mysterious validation layer I had hypothesized.

With the ACE applied to the object itself (drop `/I:S`, or use `/I:T`):

- **Delegated account, Get-Changes + Get-Changes-All: full success.** Hash returned, no admin membership, on both 2016 and 2025. The documented delegation model works, and BloodHound's edge math is safe.
- **Filtered-set-only account, no Get-Changes-All, requesting secret attributes: `ERROR_DS_DRA_ACCESS_DENIED (0x2105)`.** The semantically correct error at last. The Event 4662 trail shows `1131f6aa` checks only; `89e95b76` is **never even evaluated** when credential attributes are in the request. The filtered right does not cover secrets, and the DC does not consider it.

Two error codes, two meanings — a mapping I have not seen written down:

| Setup | Error | Real meaning |
|---|---|---|
| Inherit-only ACE (`/I:S`) | `0x20f7` BAD_DN | ACE not effective on the NC head; misleading code |
| Correct scope, missing Get-Changes-All | `0x2105` ACCESS_DENIED | Genuine insufficient rights |

One side question died along the way and deserves a line: with the inherit-only ACE still in place, I checked whether SharpHound would draw a DCSync edge from it — a path that looks exploitable in the graph but cannot execute. It does not. SharpHound v2.5.9 filters inherit-only ACEs correctly when computing attack paths.

## The dSHeuristics dead end

While the tests ran I chased a rumor: that some position in `dSHeuristics` disables DRS security checks, sometimes referred to as `fDRSNoSecurity`. I read all 31 documented character positions in [MS-ADTS]. No such flag exists. Positions 22-25 set minimum DRS request and reply versions, which restrict behavior rather than relax it. Position 31 concerns LDAP encryption of confidential attributes, not DRS. There is no configuration toggle that turns off the replication permission check. As far as the specification is concerned, this logic is hardcoded.

## What the DC is actually doing

Put the three experiments together and the mechanism is visible. When `DRSGetNCChanges` arrives with `pPartialAttrSet = [unicodePwd, supplementalCredentials]`:

1. The DC iterates the requested attributes, not the request flags.
2. Each attribute maps to a required permission in an internal table. `unicodePwd` and `supplementalCredentials` both require Get-Changes-All, unconditionally.
3. The baseline object read requires Get-Changes.
4. Each verified permission generates its own Event 4662 with the corresponding GUID.

Dimension C adds the sharpest detail: the filtered right is not an entry in that table for secret attributes at all. An account holding `89e95b76` and nothing else is not told "filtered replication is fine, secrets are not"; the DC simply never evaluates its filtered right, and the request dies with ACCESS_DENIED as if the right did not exist.

This is documented, and I should have found it before running anything. [MS-DRSR] 5.107 `IsRevealSecretRequest` spells out the decision, and it consults flags and extended operations alongside attributes:

```
if ({DRS_SPECIAL_SECRET_PROCESSING} ∩ msgIn.ulFlags) then
  return false
endif
if (msgIn.ulExtendedOp = EXOP_REPL_SECRETS or msgIn.pAttributeSet = null) then
  return true
endif
```

So "attributes, not flags" is wrong as a mechanism. The accurate reading is that a secret attribute in the set is *one* of several triggers, and the two knobs I expected to suppress the check do not: `DRS_WRIT_REP` is only consulted when `AmILHServer()` is false, which means pre-2008 servers, so removing it on 2016 or 2025 changes nothing — exactly what V2 showed. And `EXOP_REPL_SECRETS` returns true outright, so V4 and V5 were always going to check. My measurements were right; my explanation of them was not.

## The variant that contradicts the spec

V3 is the exception, and it is the part of this work I cannot close.

`IsRevealSecretRequest` returns **false** when `DRS_SPECIAL_SECRET_PROCESSING` is set. By the specification, the DC should therefore not treat V3 as a secret request and should not check Get-Changes-All. It logged `1131f6ad` anyway, on both DCs.

Three explanations fit, and I cannot separate them with the data I collected. The event may have come from a different DRS call in the same `secretsdump` run — the tool issues several, and a LogonID isolates the logon session, not individual RPC calls, so my per-variant isolation is not fine-grained enough to attribute a single 4662 to a single `DRSGetNCChanges`. The implementation may diverge from the specification. Or the DC may run an audited access check that the published routine does not represent.

Settling it needs per-call correlation: raw EVTX rather than filtered `wevtutil` output, an RPC capture, and a count of `DRSGetNCChanges` calls per run matched against events. I have not done that. If it turns out the implementation really does check Get-Changes-All where the spec says it should not, that is a more interesting result than anything else in this post.

## Two endpoints, nine years apart, zero drift

| Dimension | Server 2016 | Server 2025 (build 26100) |
|---|---|---|
| GUID `1131f6ad` logged in V1-V5 | Yes | Yes, identical set |
| GUID `89e95b76` in any variant | No | No |
| Delegated account, correct ACE scope | Success | Success |
| Filtered-set-only account, correct scope | `0x2105`, `89e95b76` never checked | `0x2105`, identical |
| Event 4662 structure per run | 1x All + 2x Get-Changes | 1x All + 2x Get-Changes |
| `SPECIAL_SECRET_PROCESSING` hash | Incorrect (key derivation) | Incorrect, same value |

These are the two endpoints of a nine-year span, and they behave identically. Server 2019 and 2022 sit untested in between. A behavioral regression that appeared in the middle releases and vanished again is implausible — but implausible is not measured, and the only claim I will sign is the one with two data points behind it: on 2016 and on 2025, attribute-driven authorization for replication behaves the same, which is exactly what a defender wants to hear. The detection built on it is not standing on a quirk that the next cumulative update might remove.

## What this leaves for operators

Nothing in the protocol. What remains is OPSEC, not protocol advancement: timing the sync between SIEM ingestion gaps, blending into the traffic profile of a legitimate Azure AD Connect server, or compromising the accounts that already hold Get-Changes-All. Those are operational measures with their own telemetry, and none of them make the DCSync itself quieter. I did not test them and won't claim they work against your stack.

## What this means for detection

The measured guarantee: on Server 2016 and Server 2025, with directory service access auditing enabled, credential replication cannot complete without an Event 4662 containing `1131f6ad`. Rules keyed on that GUID are well-founded. Keep them.

The more useful takeaway is where the real gap sits. Since the GUID cannot be avoided, an attacker's better move is making it look legitimate: granting Get-Changes-All to an account that should not have it. This is not theory — I executed exactly that path in this lab: one `dsacls` grant to a regular account, a full hash dump, no admin membership, and the same `1131f6ad` telemetry as any other DCSync. The grant is a directory change, and it is auditable. Watch for:

- **Event 5136 / 4662 (write)** modifying the ACL of the domain root object, especially ACEs carrying `1131f6ad` or `89e95b76`.
- **Get-Changes-All held by non-DC machine accounts or service accounts** as a standing state, not just an event. A periodic ACL audit of the domain root catches what event-based rules miss.

Starter Splunk query for the classic rule, included for completeness:

```
index=wineventlog EventCode=4662
  (Properties="*1131f6ad-9c07-11d1-f79f-00c04fc2dcd2*" OR Properties="*1131f6aa-9c07-11d1-f79f-00c04fc2dcd2*")
| where NOT like(Subject_Account_Name, "%$")
| stats count by Subject_Account_Name, Object_Server
```

Honest limitations: my tests ran with auditing fully enabled and known-good SACLs; an environment where the domain root SACL was tampered with would produce nothing to detect, which is one more reason to audit the ACL itself. Server 2008 R2 and 2012 remain untested; the permission logic there may predate what I measured. And `EXOP_REPL_SECRETS` deserves more attention than it gets: it retrieves credentials fine but is permission-identical to `EXOP_REPL_OBJ`, so it changes nothing for evasion, though anyone building detections on DRS RPC opcodes should treat both codes as equivalent.

## References

- [MS-DRSR]: Directory Replication Service Remote Protocol, sections 4.1.10.2, 5.41, 5.145
- [MS-DRSR] 5.107, [`IsRevealSecretRequest`](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-drsr/e72853a1-9b9c-4931-b76a-a417581890f7)
- [MS-DRSR] 4.1.10.5.8, [`AddObjToResponse`](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-drsr/55f1585c-46c1-4047-8cb0-040335f7264f)
- [MS-DRSR] 5.106, [`IsGetNCChangesPermissionGranted`](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-drsr/15bbda52-7742-4ce3-9327-018647b0fc26)
- [MS-DRSR], [`IsSecretAttribute`](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-drsr/294168d9-81bf-461b-91d7-95bd8a985737)
- [MS-ADTS]: Active Directory Technical Specification, `dSHeuristics` (6.1.1.2.4.1.2)
- Microsoft documentation, Event ID 4662
- Fortra/impacket: `secretsdump.py`, `drsuapi.py`
- Mimikatz DCSync, Benjamin Delpy / Vincent Le Toux
- simondotsh (2022), "DirSync: Leveraging Replication Get-Changes"
- MITRE ATT&CK T1003.006
