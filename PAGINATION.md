# List pagination

The UI defaults to 20 results per page and offers 10, 20, or 50. Numbered controls include previous/next, the matching record count, keyboard focus, and loading states. Searches and filters reset to page one; deletion clamps the page to the last available page. Admin user/paper row numbers and quiz/leaderboard numbers continue across pages.

## Server-paged lists

- Admin users: `GET /api/admin/users`
- Public and admin past papers, global paper search, and related-paper selection: `GET /api/past-papers`
- Admin lessons: `GET /api/courses/admin/list`

These endpoints accept `page` and `pageSize`, default to 1/20, cap page size at 100, and return `pagination: {page, pageSize, total, totalPages}` alongside the existing result field. Invalid page values return 400. Filters run before counting and paging. Every ordering includes `_id` to break ties. The client cancels obsolete requests and debounces search input.

User filters are `q` and `stream`. Paper filters are `q`, `subject`, `stream`, `year` (single year or inclusive range), `medium`, `type`, and `syllabus`. Paper `ids` supports the lesson editor's selected-paper view. Admin course filters are `q`, `subject`, and `status`. Search is literal, case-insensitive substring matching, with bounded query length; regex syntax is escaped.

Paper subject/year/medium choices come from a separate metadata endpoint, so options do not disappear when paging. The admin lesson topic suggestions also use a separate metadata endpoint. Paper quiz answers and file-storage details are excluded from list responses; only quiz counts are projected. The app no longer downloads the entire paper library at startup or on window focus. CSV exports and broadcasts retain their complete intended scope.

## Display-paged lists

The student course catalogue, syllabus topics, mistakes, targets, daily tasks, planner day/repeat lists, study-plan table/card lists and daily topics, reminder list, admin quiz bank, and existing top-50 leaderboard use display pagination. Their full underlying datasets remain available for completion totals, next-lesson navigation, offline study, full exports, or full-state synchronization. This reduces rendered elements but does **not** reduce their API payload sizes. Calendar grids, small subject menus, individual lesson/quiz editors, and dashboard previews keep their existing presentation.

## Database indexes and deployment

New nonunique indexes support user creation-date/stream ordering, paper creation-date/subject/syllabus/stream ordering, and admin course subject/status ordering. No existing indexes are removed. Mongoose declares these indexes on startup; if production disables automatic index creation, create the declared indexes through the deployment's normal database migration process before verifying performance. This change does not connect to or modify production data during testing.

Deploy the server and client together: older clients expecting an unlimited list must be upgraded to consume pagination. Refresh cached frontend assets after deployment. Index-backed ordering and smaller responses should reduce transfer and rendering work. Exact counts and substring searches can still scan many matching records; very deep numbered pages also incur offset costs. Measure production queries with `explain('executionStats')` before adding further indexes or moving to cursor pagination. No production latency improvement has been measured.

## Validation

- `cd server && npm run test:pagination`: query validation, escaped search, stream/year filters, page clamping, query limits/order, safe paper projection, and admin middleware guards using model spies.
- Server TypeScript check passes.
- Production client build passes; existing unrelated client TypeScript diagnostics remain, with no new diagnostics from pagination.
- Local headless Edge tests with mock API responses cover desktop/mobile paging, full-collection searches, repeated filter resets, page-size changes, zero matches, overlapping requests, admin users/courses, and deleting the last row on a local page.

Live MongoDB query plans, index creation, production deployment, and production latency are not verified by these local checks.
