import {
    Schema,
    model,
    type InferSchemaType,
} from "mongoose";

const analyticsEventSchema = new Schema(
    {
        shortCode: {
            type: String,
            required: true,
            index: true,
        },

        timestamp: {
            type: Date,
            required: true,
            index: true,
        },

        ip: {
            type: String,
            default: null,
        },

        browser: {
            type: String,
            required: true,
        },

        os: {
            type: String,
            required: true,
        },

        device: {
            type: String,
            required: true,
        },

        referrer: {
            type: String,
            default: null,
        },

        path: {
            type: String,
            required: true,
        },

        statusCode: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

analyticsEventSchema.index({
    shortCode: 1,
    timestamp: -1,
});

analyticsEventSchema.index({
    shortCode: 1,
    ip: 1,
});

export type AnalyticsEvent = InferSchemaType< typeof analyticsEventSchema >;

export const AnalyticsEventModel = model("AnalyticsEvent", analyticsEventSchema);