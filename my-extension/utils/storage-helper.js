/* Storage helper for listings and negotiation sessions.
	 Uses chrome.storage.local and returns Promises for async/await usage. */

const STORAGE_KEYS = {
	LISTINGS: 'neg_listings',
	SESSIONS: 'neg_sessions'
};

const storage = {
	async get(key, defaultValue) {
		return new Promise((resolve) => {
			chrome.storage.local.get([key], (result) => {
				resolve(result[key] ?? defaultValue);
			});
		});
	},

	async set(obj) {
		return new Promise((resolve) => {
			chrome.storage.local.set(obj, () => resolve());
		});
	}
};

export async function getListings() {
	return (await storage.get(STORAGE_KEYS.LISTINGS, []));
}

export async function saveListing(listing) {
	const listings = await getListings();
	if (!listing.id) listing.id = `lst_${Date.now()}`;
	const idx = listings.findIndex((l) => l.id === listing.id);
	if (idx >= 0) listings[idx] = listing; else listings.push(listing);
	await storage.set({ [STORAGE_KEYS.LISTINGS]: listings });
	return listing;
}

export async function deleteListing(id) {
	const listings = await getListings();
	const filtered = listings.filter((l) => l.id !== id);
	await storage.set({ [STORAGE_KEYS.LISTINGS]: filtered });
}

export async function getSessions() {
	return (await storage.get(STORAGE_KEYS.SESSIONS, []));
}

export async function saveSession(session) {
	const sessions = await getSessions();
	if (!session.id) session.id = `sess_${Date.now()}`;
	const idx = sessions.findIndex((s) => s.id === session.id);
	if (idx >= 0) sessions[idx] = session; else sessions.push(session);
	await storage.set({ [STORAGE_KEYS.SESSIONS]: sessions });
	return session;
}

export async function deleteSession(id) {
	const sessions = await getSessions();
	const filtered = sessions.filter((s) => s.id !== id);
	await storage.set({ [STORAGE_KEYS.SESSIONS]: filtered });
}

export default {
	getListings,
	saveListing,
	deleteListing,
	getSessions,
	saveSession,
	deleteSession
};
