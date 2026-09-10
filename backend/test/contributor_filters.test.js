const test = require('node:test');
const assert = require('node:assert/strict');

const {
    BOT_CONTRIBUTOR_USERNAMES,
    buildHumanContributorSqlCondition,
    filterBotContributors,
    isBotContributor,
} = require('../contributor_filters');

test('treats ordinary and empty usernames as human contributors', () => {
    for (const username of ['alice', 'octocat', '', '   ', null, undefined]) {
        assert.equal(isBotContributor(username), false, `expected ${String(username)} to be human`);
    }
});

test('normalizes username casing and surrounding whitespace', () => {
    assert.equal(isBotContributor('  Dependabot  '), true);
    assert.equal(isBotContributor('GITHUB-ACTIONS'), true);
    assert.equal(isBotContributor('  Alice  '), false);
});

test('recognizes arbitrary usernames with the bot suffix', () => {
    for (const username of ['release[bot]', 'CUSTOM-AUTOMATION[BOT]', '  helper[bot]  ']) {
        assert.equal(isBotContributor(username), true, `expected ${username} to be a bot`);
    }
});

test('recognizes known bot usernames without the bot suffix', () => {
    for (const username of ['dependabot', 'dependabot-preview', 'github-actions', 'renovate', 'copilot-swe-agent']) {
        assert.equal(isBotContributor(username), true, `expected ${username} to be a known bot`);
    }
});

test('filters bots while preserving human contributor order and objects', () => {
    const alice = { username: 'alice', contributions: 5 };
    const bob = { username: 'bob', contributions: 3 };
    const contributors = [
        alice,
        { username: 'dependabot', contributions: 20 },
        { username: 'release[bot]', contributions: 10 },
        bob,
    ];

    const filteredContributors = filterBotContributors(contributors);

    assert.deepEqual(filteredContributors, [alice, bob]);
    assert.strictEqual(filteredContributors[0], alice);
    assert.strictEqual(filteredContributors[1], bob);
});

test('builds the SQL conditions used to exclude bot contributors', () => {
    const condition = buildHumanContributorSqlCondition();
    const botUsernameLiterals = BOT_CONTRIBUTOR_USERNAMES
        .map((username) => `'${username.replace(/'/g, "''")}'`)
        .join(', ');

    assert.equal(
        condition,
        `LOWER(c.github_username) NOT LIKE '%[bot]' AND LOWER(c.github_username) NOT IN (${botUsernameLiterals})`,
    );

    const customCondition = buildHumanContributorSqlCondition('author.login');
    assert.equal(
        customCondition,
        `LOWER(author.login) NOT LIKE '%[bot]' AND LOWER(author.login) NOT IN (${botUsernameLiterals})`,
    );
});
