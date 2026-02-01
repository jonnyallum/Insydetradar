/**
 * Notification Service
 * Handles sending push notifications via Expo Push API
 * 
 * @author Jonny AI
 */

import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

let expo = new Expo();

export class NotificationService {
    private static instance: NotificationService;

    private constructor() { }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Send a notification to a specific user
     */
    async sendToUser(userId: string, title: string, body: string, data?: any) {
        const db = await getDb();
        if (!db) {
            console.error('Database not available for notification');
            return;
        }

        // Fetch user's push token
        const userList = await db.select({ pushToken: users.pushToken }).from(users).where(eq(users.id, userId)).limit(1);
        const pushToken = userList[0]?.pushToken;

        if (!pushToken) {
            console.log(`User ${userId} has no push token. Skipping notification.`);
            return;
        }

        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            return;
        }

        const messages: ExpoPushMessage[] = [{
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
        }];

        try {
            const chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Notification sent successfully:', ticketChunk);
            }
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    /**
     * Send a notification to multiple users
     */
    async broadcast(userIds: string[], title: string, body: string, data?: any) {
        await Promise.all(userIds.map(id => this.sendToUser(id, title, body, data)));
    }
}

export const notificationService = NotificationService.getInstance();
