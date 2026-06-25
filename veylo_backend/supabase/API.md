# Veylo Backend API

Edge Functions (Supabase Deno), Postgres RPCs (PostgREST), Storage, and cron jobs.

|                 |                                                                |
| --------------- | -------------------------------------------------------------- |
| **Project ref** | `igeyjmcfklymyeaahmtw`                                         |
| **REST**        | `https://igeyjmcfklymyeaahmtw.supabase.co`                     |
| **Functions**   | `https://igeyjmcfklymyeaahmtw.supabase.co/functions/v1/<name>` |
| **RPC**         | `https://igeyjmcfklymyeaahmtw.supabase.co/rest/v1/rpc/<name>`  |

Most calls:

```
Authorization: Bearer <user_jwt>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

**Cron:** `digest-weekly`, `embeddings-backfill` use `verify_jwt=false` and require header `x-cron-secret: <CRON_SECRET>`. Returns **501** if env unset.

**Service-only:** `notifications-send` requires `Authorization: Bearer <SERVICE_ROLE_JWT>` (same JWT gateway verification).

---

## Edge Functions

| Name                    | Auth        | Summary                                                   |
| ----------------------- | ----------- | --------------------------------------------------------- |
| `tag-item`              | User        | Vision tagging + embedding upsert                         |
| `generate-embedding`    | User        | Text embeddings                                           |
| `tryon-generate`        | User        | Google VTO (`virtual-try-on-001`); synchronous PNG result |
| `tryon-status`          | User        | Legacy lookup for old Replicate pending rows              |
| `delete-account`        | User        | Purge storage + delete auth user                          |
| `weather-enrich`        | User        | OpenWeather cache proxy                                   |
| `generate-outfit-ideas` | User        | Outfit heuristic generator                                |
| `recommend-items`       | User        | GPT ranks wardrobe IDs (+ optional vector similarity)     |
| `style-chat`            | User        | Short stylist replies from wardrobe summary               |
| `generate-avatar`       | User        | Imagen 3 subject customization → `avatars` bucket + row   |
| `moderate-image`        | User        | Caption/image moderation gate                             |
| `feed-create-post`      | User        | Moderate + insert `feed_posts`                            |
| `feed-list`             | User        | Calls RPC `feed_for_user`; adds signed URLs               |
| `feed-toggle-like`      | User        | Like/unlike                                               |
| `feed-add-comment`      | User        | Moderated comments                                        |
| `feed-follow`           | User        | Follow/unfollow                                           |
| `notifications-send`    | Service JWT | Push via Expo + insert `notifications`                    |
| `digest-weekly`         | Cron secret | Weekly reminders                                          |
| `gamification-events`   | User        | Points + badges                                           |
| `embeddings-backfill`   | Cron secret | Batch missing embeddings                                  |

### Core payloads (short)

**tag-item:** `{ item_id, image_path? }`

**tryon-generate:** `{ user_image_path, user_image_bucket?, garment_image_path, outfit_id?, session_id? }` → `{ ok, status: "succeeded", record }` (Google Vertex AI VTO; synchronous)

**tryon-status:** `{ prediction_id }` — legacy Replicate row lookup only

**recommend-items:** `{ context?: feed|gaps|similar, item_id?, occasion?, season?, limit? }`

**style-chat:** `{ messages:[{role,content}] }` → `{ ok, reply }`

**generate-avatar:** `{ photo_path, photo_bucket?, body_type? }` → `{ ok, avatar, signed_thumbnail_url }` (Imagen 3 Customization)

**moderate-image:** `{ image_url? }` or `{ bucket, path, caption? }`

**feed-create-post:** `{ image_path, caption?, outfit_id?, item_ids?, visibility? }`

**feed-list:** `{ scope?: following|public, limit?, offset? }`

**feed-toggle-like:** `{ post_id, liked? }`

**feed-add-comment:** `{ post_id, body }`

**feed-follow:** `{ followee_id, follow? }`

**notifications-send:** `{ user_id, title, body?, type?, data? }`

**gamification-events:** `{ event: outfit_logged|item_added|tryon_completed }`

---

## RPCs (`POST /rest/v1/rpc/...`)

| Name                | Notes                                                            |
| ------------------- | ---------------------------------------------------------------- |
| `match_items`       | Args: `query_embedding`, `match_count?`, `similarity_threshold?` |
| `wardrobe_stats`    | Optional `target_user_id` — must equal caller                    |
| `find_style_gaps`   | Optional `target_user_id` — must equal caller                    |
| `recommend_outfit`  | Vector + optional occasion/season filters                        |
| `style_match_score` | Returns int 0–100                                                |
| `feed_for_user`     | Args: `feed_scope`, `page_limit`, `page_offset`                  |

---

## Schema additions

`avatars`, `collections`, `collection_items`, `user_stats`, `badges`, `user_badges`, `feed_posts`, `feed_post_items`, `feed_likes`, `feed_comments`, `follows`, `notifications`, `error_logs`, `rate_limits`.

`try_on_history` gains `replicate_prediction_id` (legacy), `status`, `error`; `result_image_path` nullable while processing. New try-ons use Google VTO synchronously (`replicate_prediction_id` null).

## Vertex AI secrets (Edge Functions)

| Secret                | Purpose                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `GCP_PROJECT_ID`      | Google Cloud project ID                                            |
| `GCP_LOCATION`        | Region (default `us-central1`; VTO/Imagen must be supported there) |
| `GCP_SA_CLIENT_EMAIL` | Service account email                                              |
| `GCP_SA_PRIVATE_KEY`  | PEM private key (`\n` escaped in one line is OK)                   |

Requires Vertex AI API enabled and service account with **Vertex AI User** role.

Buckets: `item-photos`, `avatars`, `tryon-results`, **`feed-photos`** (private; cross-user reads via signed URLs from `feed-list`).

---

## Smoke test

```bash
export SUPABASE_URL=...
export SUPABASE_ANON_KEY=...
npm run backend:smoke
```

## Types

```bash
npm run backend:types   # requires Supabase CLI
```
