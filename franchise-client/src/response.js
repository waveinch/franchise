const { Client: PostgresClient } = require('pg')
const credentials = require('./credentials.js')

const localCtx = {}
module.exports = async function response(message, ctx = localCtx) {
    const { action, id } = message

    try {
        if (action === 'open') {
            const { credentials, db } = message

            ctx.client = await createClient(db, credentials)
            return { ready: true }
        } else if (action === 'exec') {
            const { sql } = message

            const results = await ctx.client.query(sql, message)
            return { results }
        } else if (action === 'close') {
            await ctx.client.close()

            return { closed: true }
        } else if (action == 'get_postgres_credentials') {
            return credentials
        } else {
            throw new Error('Unknown action: ' + action)
        }
    } catch (e) {
        console.log(e)
        return { error: e.message || e.stack.split('\n')[0] }
    }
}

async function createClient(db, credentials) {
    if (db === 'postgres') return await createPostgresClient(credentials)
    throw new Error('database ' + db + ' not recognized')
}

async function createPostgresClient(credentials) {
    const client = new PostgresClient(credentials)
    ;[1082, 1114, 1184].forEach((oid) => client.setTypeParser(oid, (val) => val))
    await client.connect()
    return {
        async query(sql) {
            let results = await client.query({
                text: sql,
                rowMode: 'array',
            })
            if (Array.isArray(results)) {
                results = results[results.length - 1]
            }
            // console.log(results.rows, results)
            if (results.rows.length > 10000)
                throw new Error('Too many result rows to serialize: Try using a LIMIT statement.')
            return results
        },
        close: client.end.bind(client),
    }
}
