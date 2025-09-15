import { relations } from "drizzle-orm/relations";
import { user, scene, messageV2, message, stream, voteV2, vote } from "./schema";

export const sceneRelations = relations(scene, ({one, many}) => ({
	user: one(user, {
		fields: [scene.userId],
		references: [user.id]
	}),
	messageV2s: many(messageV2),
	messages: many(message),
	streams: many(stream),
	voteV2s: many(voteV2),
	votes: many(vote),
}));

export const userRelations = relations(user, ({many}) => ({
	scenes: many(scene),
}));

export const messageV2Relations = relations(messageV2, ({one, many}) => ({
	scene: one(scene, {
		fields: [messageV2.sceneId],
		references: [scene.id]
	}),
	voteV2s: many(voteV2),
}));

export const messageRelations = relations(message, ({one, many}) => ({
	scene: one(scene, {
		fields: [message.sceneId],
		references: [scene.id]
	}),
	votes: many(vote),
}));

export const streamRelations = relations(stream, ({one}) => ({
	scene: one(scene, {
		fields: [stream.sceneId],
		references: [scene.id]
	}),
}));

export const voteV2Relations = relations(voteV2, ({one}) => ({
	scene: one(scene, {
		fields: [voteV2.sceneId],
		references: [scene.id]
	}),
	messageV2: one(messageV2, {
		fields: [voteV2.messageId],
		references: [messageV2.id]
	}),
}));

export const voteRelations = relations(vote, ({one}) => ({
	scene: one(scene, {
		fields: [vote.sceneId],
		references: [scene.id]
	}),
	message: one(message, {
		fields: [vote.messageId],
		references: [message.id]
	}),
}));