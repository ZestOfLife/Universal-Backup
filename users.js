'use strict';

let Users = Object.assign(getUser, {
	users: new Map(),
	addUser,
	renameUser,
});

class User {
	constructor(name, group) {
		this.userid = toId(name);
		this.name = name;
		if (!(group.slice(0, 1) in Config.groups)) {
			debug(`Unhandled group: ${group} for ${name}`);
			group = ' ';
		}
		this.group = group;
		this.isDev = false; // TODO dev perms like eval, basically its bot admin
		this.rooms = [];
	}

	/**
	 * @param {string} permission
	 * @param {User?} targetUser
	 * @param {Room?} room
	 */
	can(permission, targetUser, room) {
		let permissions = Config.groups[this.group]; // TODO support roomauth, make sure the higher auth overrides the lower
		if (!permissions) return false; // ??!
		if (permission.root || this.isDev) return true;
		let auth = permissions[permission];
		if (auth === undefined && permissions.inherit) {
			let depth = 0;
			while (auth === undefined && permission.inherit && depth < 10) {
				permissions = Config.groups[permissions.inherit];
				if (!permissions) break;
				auth = permissions[permission];
				depth++;
			}
		}
		switch (auth) {
		case 'u':
			let groupsIndex = Object.keys(Config.groups);
			return (targetUser && groupsIndex.indexOf(this.group) > groupsIndex.indexOf(targetUser.group));
		case 's':
			return (targetUser && targetUser.userid === this.userid);
		default:
			return !!auth;
		}
	}
}

function getUser(name) {
	if (typeof name === 'object') return name;
	return this.users.get(toId(name));
}

// adds a user, or if the user already exists, return them
function addUser(name) {
	let user = Users(toId(name));
	if (user) return user;
	user = new User(name.substring(1), name.substring(0, 1));
	return user;
}

function renameUser(from, to) {
	const oldId = toId(from);
	const newId = toId(to);
	// this can fire multiple times, since the rename message gets sent to each room theyre in
	if (!Users(oldId) && Users(newId)) return true;
	const user = User(oldId);
	if (!user) return debug(`Renaming non-existent user ${from} to ${to}`);
	user.name = to.substring(1);
	let group = to.substring(0, 1);
	if (!(group in Config.groups)) {
		debug(`Unhandled group: ${group} for ${to}`);
		group = ' ';
	}
	user.group = group;
	user.userid = newId;
	Users.users.set(newId, user);
	Users.users.delete(oldId);
	return true;
}

module.exports = Users;
