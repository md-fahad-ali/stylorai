import db from '../db/client';

export interface FashionPreferences {
    id?: number;
    user_id: number;
    season: string[];
    style: string[];
    preferences_color: string[];
    color?: string[]; // New field
    body_type?: string;
    skin_tone?: string;
    created_at?: Date;
    updated_at?: Date;
}

const FashionPreferencesModel = {
    /**
     * Find fashion preferences by user ID
     */
    findByUserId: async (userId: number): Promise<FashionPreferences | undefined> => {
        const query = 'SELECT * FROM fashion_preferences WHERE user_id = $1';
        const { rows } = await db.query(query, [userId]);

        if (rows.length === 0) return undefined;

        // Parse JSONB arrays back to JavaScript arrays
        const row = rows[0];
        return {
            ...row,
            season: row.season || [],
            style: row.style || [],
            preferences_color: row.preferences_color || [],
            // If color is empty/null, fallback to preferences_color
            color: (row.color && row.color.length > 0) ? row.color : (row.preferences_color || []),
        };
    },

    /**
     * Create new fashion preferences for a user (or update if exists - upsert)
     */
    create: async (data: Partial<FashionPreferences>): Promise<FashionPreferences> => {
        const query = `
            INSERT INTO fashion_preferences 
            (user_id, season, style, preferences_color, color, body_type, skin_tone)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id) DO UPDATE SET
                season = EXCLUDED.season,
                style = EXCLUDED.style,
                preferences_color = EXCLUDED.preferences_color,
                color = EXCLUDED.color,
                body_type = EXCLUDED.body_type,
                skin_tone = EXCLUDED.skin_tone,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const values = [
            data.user_id,
            JSON.stringify(data.season || []),
            JSON.stringify(data.style || []),
            JSON.stringify(data.preferences_color || []),
            JSON.stringify(data.color || []), // Add color
            data.body_type || null,
            data.skin_tone || null,
        ];

        const { rows } = await db.query(query, values);
        const row = rows[0];

        return {
            ...row,
            season: row.season || [],
            style: row.style || [],
            preferences_color: row.preferences_color || [],
        };
    },

    /**
     * Update fashion preferences for a user
     */
    update: async (userId: number, data: Partial<FashionPreferences>): Promise<FashionPreferences | undefined> => {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        // Build dynamic UPDATE query
        if (data.season !== undefined) {
            fields.push(`season = $${idx}`);
            values.push(JSON.stringify(data.season));
            idx++;
        }
        if (data.style !== undefined) {
            fields.push(`style = $${idx}`);
            values.push(JSON.stringify(data.style));
            idx++;
        }
        if (data.preferences_color !== undefined) {
            fields.push(`preferences_color = $${idx}`);
            values.push(JSON.stringify(data.preferences_color));
            idx++;
        }
        if (data.body_type !== undefined) {
            fields.push(`body_type = $${idx}`);
            values.push(data.body_type);
            idx++;
        }
        if (data.color !== undefined) {
            fields.push(`color = $${idx}`);
            values.push(JSON.stringify(data.color));
            idx++;
        }
        if (data.skin_tone !== undefined) {
            fields.push(`skin_tone = $${idx}`);
            values.push(data.skin_tone);
            idx++;
        }

        if (fields.length === 0) return undefined;

        // Always update updated_at
        fields.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(userId);
        const query = `
            UPDATE fashion_preferences 
            SET ${fields.join(', ')} 
            WHERE user_id = $${idx}
            RETURNING *
        `;

        const { rows } = await db.query(query, values);

        if (rows.length === 0) return undefined;

        const row = rows[0];
        return {
            ...row,
            season: row.season || [],
            style: row.style || [],
            preferences_color: row.preferences_color || [],
        };
    },

    /**
     * Upsert (Insert or Update) fashion preferences
     * Creates if doesn't exist, updates if exists
     */
    upsert: async (userId: number, data: Partial<FashionPreferences>): Promise<FashionPreferences> => {
        // Check if preferences exist
        const existing = await FashionPreferencesModel.findByUserId(userId);

        if (existing) {
            // Update existing preferences
            const updated = await FashionPreferencesModel.update(userId, data);
            return updated!;
        } else {
            // Create new preferences
            return await FashionPreferencesModel.create({
                user_id: userId,
                ...data,
            });
        }
    },

    /**
     * Delete fashion preferences for a user
     */
    delete: async (userId: number): Promise<boolean> => {
        const query = 'DELETE FROM fashion_preferences WHERE user_id = $1';
        const result = await db.query(query, [userId]);
        return result.rowCount !== null && result.rowCount > 0;
    },
};

export default FashionPreferencesModel;
