// Wrapper for auth and XHR to remote server.
// Raises event: "updated"
class LarpServiceContext extends EventTarget {
    constructor() {
        super();

        const staff_match = document.cookie.match(/staff_key=([a-f0-9-]+)/);
        this._staff_key = staff_match && staff_match[1] || null;

        const player_match = document.cookie.match(/player_key=([a-f0-9-]+)/);
        this._player_key = player_match && player_match[1] || null;

        this._data = null;
        this._error = null;

        this.refresh();
    }

    isUnauthenticated() { return this._staff_key == null && this._player_key == null; }

    isStaff() { return this._staff_key; }

    isPlayer() { return this._player_key; }

    data() { return this._data; }

    error() { return this._error; }

    async submitJournal(description_md, thread, tags) {
        const json = {
            tags: tags,
            thread: thread,
            description_md: description_md
        };

        const url = 'api/addWorldJournalEntry?key=' + this._staff_key;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json)
        });

        if (!res.ok) {
            this._error = await res.text();
        }
    }

    async submitDowntime(proposal, opt_uid) {
        const json = {
            proposal: proposal
        };

        if (opt_uid) {
            json['uid'] = opt_uid;
        }

        const url = 'api/updateDowntime?key=' + this._player_key;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json)
        });

        if (!res.ok) {
            this._error = await res.text();
        }
    }

    async rejectDowntime(player_key, uid, staff_comment) {
        const json = {
            player_key: player_key,
            uid: uid,
            staff_comment: staff_comment
        };

        const url = 'api/rejectDowntime?key=' + this._staff_key;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json)
        });

        if (!res.ok) {
            this._error = await res.text();
        }
    }

    async acceptDowntime(player_key, uid, journal_entry, tags) {
        const json = {
            player_key: player_key,
            uid: uid,
            journal_entry: journal_entry,
            tags: tags
        };

        const url = 'api/acceptDowntime?key=' + this._staff_key;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json)
        });

        if (!res.ok) {
            this._error = await res.text();
        }
    }

    async updateStats(stats) {
        const body = JSON.stringify({ stats: stats });
        const url = 'api/updateStats?key=' + this._player_key;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (!res.ok) {
            this._error = await res.text();
        }
    }

    async deleteTag(key, tag) {
        const body = JSON.stringify({ player_key: key, tags: [tag] });
        const url = 'api/removeTags?key=' + this._staff_key;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (!res.ok) {
            this._error = await res.text();
        }
    }

    async addTags(key, tags) {
        const body = JSON.stringify({ player_key: key, tags: tags });
        const url = 'api/addTags?key=' + this._staff_key;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (!res.ok) {
            this._error = await res.text();
        }
    }

    async publishDrafts() {
        const url = 'api/releaseJournalDrafts?key=' + this._staff_key;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: ''
        });

        if (!res.ok) {
            this._error = await res.text();
        }
    }

    async addCharacter(shadowName, playerName) {
        const body = JSON.stringify({ player_name: playerName, shadow_name: shadowName });
        const url = 'api/newPlayer?key=' + this._staff_key;
        const res = await fetch(url, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (!res.ok) {
            this._error = await res.text();
            throw new Error('Request failed: ' +  this._error);
        }

        const responseBody = await res.json();
        return {
            player_name: playerName,
            shadow_name: shadowName,
            stats: {},
            key: responseBody.key,
            tags: [],
            downtime: []
        };
    }

    async refresh() {
        const url = this.isStaff() ? ('api/staffData?key=' + this._staff_key) : ('api/playerData?key=' + this._player_key);
        const res = await fetch(url);
        if (res.ok) {
            this._data = await res.json();
        } else {
            this._error = await res.text();
        }

        this.dispatchEvent(new Event("updated"));
    }
}

const _larpServiceContextSingleton = new LarpServiceContext();

export function GetLarpServiceContext() {
    return _larpServiceContextSingleton;
}