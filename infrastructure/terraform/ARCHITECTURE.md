# Captured architecture and reconstruction decisions

Inventory comments in the original branch were dated 2026-03-02. AWS is now
reported deleted, so the historical claims cannot be rechecked against that account.
The original snapshot remains in Git history on `tdu---mux-only-media-uploader`
and in the first commit of `tdu---aws-infrastructure-preservation`.

| Area | Captured organization | Recreated configuration / limits |
| --- | --- | --- |
| Region | Paris (`eu-west-3`); CloudFront ACM in `us-east-1` | Same defaults, configurable regional provider |
| Networking | Default VPC `172.31.0.0/16`, three public subnets, Lambda/RDS SG IDs | Explicit VPC, three public and three private subnets, IGW, one NAT, route tables; original CIDRs/rules were unavailable |
| Database | `db-kyool-2025-01-02`, PostgreSQL 15.13, `db.t4g.micro`, 20 GiB gp2, encrypted, `kyool_media`, one-day backups | New subnet group and environment-based identifier; PostgreSQL 15 family selectable; deletion protection added; empty DB |
| Compute | `kyool-api-production` ECR and image Lambda, x86_64, 2048 MiB, 30s | Same service organization; image is an explicit prerequisite; generated RDS endpoint/password wiring |
| API | HTTP API, Lambda proxy payload v2, `$default` and `ANY /{proxy+}`, production stage, CORS | Fresh API/integration/routes/stage/permission; CORS uses new site/backoffice endpoints |
| IAM | Lambda trust, log/VPC permissions, S3, Secrets Manager, SSM, KMS access | Same role organization; generated S3 ARNs; no obsolete account/bucket IDs |
| Content | `kyool-prod-site`, `kyool-public-files`, `kyool-public-pictures` | Separate private buckets, encryption/versioning, distribution-scoped OAC policies |
| Backoffice | CloudFront originated from `kyool-backoffice`; `example-backoffice` also existed | Separate backoffice and legacy buckets; distribution uses backoffice role; legacy bucket has no published origin |
| Other storage | `kyool-lambda-production`, `kyool-temp-uploads`; media bucket was proposed but absent | Separate lambda_scratch, temp_uploads and media roles; no stored objects |
| CDN | Two distributions: main aliases eu/fr/www, and backoffice CF hostname; three main origins | Generated origin endpoints; explicit configurable files/pictures behaviors; SPA rewrite only on default behavior |
| DNS/TLS | External DNS, no Route53 zones in inventory | External records emitted as outputs; ACM validation published manually; no automatic DNS migration |
| Secrets | Lambda env keys plus proposed Secrets Manager/SSM/KMS organization | Empty secret containers and SSM base path; new env secrets supplied separately and present in state |
| Logs | Lambda and API Gateway log groups | Defined retention; API access logging remains optional/unconfigured |
| State | Proposed S3 state bucket + DynamoDB locking | New account-selected bootstrap and partial backend |

Historical main distribution: `EXAMPLEWEBDIST`; backoffice: `EXAMPLEAPIDIST`.
Historical VPC: `vpc-00000000000000000`; account: `000000000000`.
These identifiers are evidence only and are not deployment inputs.

The private-subnet/NAT layout, SG rules, CDN content path patterns, generated
bucket names, private REST endpoint for public files, versioning on all buckets,
and deletion guards are reconstruction choices. The old files origin was an S3
website endpoint; it now uses OAC, so website redirects/index behavior are not
preserved for content origins. Security groups permit only Lambda-to-RDS on 5432;
manual database administration needs a separately designed access path.

Not captured: exact SG/NACL rules, original cache policies/path patterns, external
DNS zone contents, application artifacts, secrets, data, and any unlisted services.
No database/files backup or exact old URLs is implied. The historical API custom
domain, if one existed, is not reconstructed; use the generated invoke URL.
