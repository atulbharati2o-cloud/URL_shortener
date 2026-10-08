import { AnalyticsEventModel } from "./analytics.model.js";

export async function getUrlAnalytics(
    shortCode: string,
) {
    const [
        totalClicks,
        uniqueVisitors,
        deviceBreakdown,
        browserBreakdown,
    ] = await Promise.all([
        AnalyticsEventModel.countDocuments({
            shortCode,
        }),

        AnalyticsEventModel.distinct(
            "ip",
            { shortCode },
        ),

        AnalyticsEventModel.aggregate([
            { $match: { shortCode } },
            {
                $group: {
                    _id: "$device",
                    count: { $sum: 1 },
                },
            },
        ]),

        AnalyticsEventModel.aggregate([
            { $match: { shortCode } },
            {
                $group: {
                    _id: "$browser",
                    count: { $sum: 1 },
                },
            },
        ]),
    ]);

    const timeBasedStats =
        await AnalyticsEventModel.aggregate([
            {
                $match: {
                    shortCode,
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$timestamp",
                        },
                    },
                    clicks: {
                        $sum: 1,
                    },
                },
            },
            {
                $sort: {
                    _id: 1,
                },
            },
        ]);

    return {
        totalClicks,
        uniqueVisitors: uniqueVisitors.filter(Boolean).length,

        devices: Object.fromEntries(
            deviceBreakdown.map((item) => [
                item._id,
                item.count,
            ]),
        ),

        browsers: Object.fromEntries(
            browserBreakdown.map((item) => [
                item._id,
                item.count,
            ]),
        ),

        timeBased: timeBasedStats.map(
            (item) => ({
                date: item._id,
                clicks: item.clicks,
            }),
        )
    };
}