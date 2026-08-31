const MAX_RANKING = 1000;
const MAX_NAME_LENGTH = 20;
const MAX_SCORE = 1000000000;
const MAX_DB = 200;

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Cache-Control": "no-store"
        }
    });
}

function sanitizeName(value) {
    const name = String(value ?? "名無し")
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .trim()
        .slice(0, MAX_NAME_LENGTH);

    return name || "名無し";
}

function validNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const limitParam = Number(url.searchParams.get("limit"));

        const limit = Math.min(
            MAX_RANKING,
            Math.max(
                1,
                Number.isFinite(limitParam)
                    ? Math.floor(limitParam)
                    : MAX_RANKING
            )
        );

        const result = await context.env.DB.prepare(`
            SELECT id, name, score, db, created_at
            FROM rankings
            ORDER BY score DESC, db DESC, created_at ASC, id ASC
            LIMIT ?
        `).bind(limit).all();

        return json({
            ok: true,
            ranking: result.results || []
        });
    } catch (error) {
        console.error("GET /api/ranking failed", error);

        return json({
            ok: false,
            error: "ランキングの取得に失敗しました。"
        }, 500);
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();

        const name = sanitizeName(body.name);
        const score = Number(body.score);
        const db = Number(body.db);

        if (
            !validNumber(score) ||
            !Number.isInteger(score) ||
            score < 0 ||
            score > MAX_SCORE
        ) {
            return json({
                ok: false,
                error: "スコアが不正です。"
            }, 400);
        }

        if (
            !validNumber(db) ||
            db < 0 ||
            db > MAX_DB
        ) {
            return json({
                ok: false,
                error: "dB値が不正です。"
            }, 400);
        }

        const roundedDb = Math.round(db * 10) / 10;
        const createdAt = Date.now();

        await context.env.DB.prepare(`
            INSERT INTO rankings (name, score, db, created_at)
            VALUES (?, ?, ?, ?)
        `).bind(
            name,
            score,
            roundedDb,
            createdAt
        ).run();

        await context.env.DB.prepare(`
            DELETE FROM rankings
            WHERE id NOT IN (
                SELECT id
                FROM rankings
                ORDER BY score DESC, db DESC, created_at ASC, id ASC
                LIMIT ?
            )
        `).bind(MAX_RANKING).run();

        const rankRow = await context.env.DB.prepare(`
            SELECT COUNT(*) + 1 AS rank
            FROM rankings
            WHERE score > ?
               OR (score = ? AND db > ?)
               OR (score = ? AND db = ? AND created_at < ?)
        `).bind(
            score,
            score,
            roundedDb,
            score,
            roundedDb,
            createdAt
        ).first();

        const rank = Number(rankRow?.rank || 0);

        return json({
            ok: true,
            accepted: rank >= 1 && rank <= MAX_RANKING,
            rank
        });
    } catch (error) {
        console.error("POST /api/ranking failed", error);

        return json({
            ok: false,
            error: "ランキングの保存に失敗しました。"
        }, 500);
    }
}
