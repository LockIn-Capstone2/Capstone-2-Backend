"use client";

import { TrendingUp } from "lucide-react";
import {
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const description =
  "Streak progress radial chart showing current streak vs target";

// Transform streak data for radial chart
const transformStreakData = (streakData) => {
  if (!streakData) return [];

  // Handle both normalized and raw streak data
  const current = streakData.current || streakData.currentStreak || 0;
  const goal = streakData.goal || streakData.nextMilestone || 30;
  const percent =
    streakData.percent || Math.min(100, Math.round((current / goal) * 100));

  // Create data for the radial chart
  return [
    {
      name: "Current Progress",
      value: percent,
      fill: "#3b82f6",
      streak: current,
      goal: goal,
    },
  ];
};

export function StreakProgressRadialChart({ data: streakData }) {
  const transformedData = transformStreakData(streakData);

  // Handle both normalized and raw streak data
  const current = streakData?.current || streakData?.currentStreak || 0;
  const goal = streakData?.goal || streakData?.nextMilestone || 30;
  const percent =
    streakData?.percent || Math.min(100, Math.round((current / goal) * 100));

  // Calculate trend (comparing current vs goal)
  const isTrendingUp = current > 0;
  const progressToGoal = goal > 0 ? Math.round((current / goal) * 100) : 0;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="text-center">
        <CardTitle>🔥 Streak Progress</CardTitle>
        <CardDescription>
          Current streak progress towards next milestone
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            data={transformedData}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              minAngle={15}
              background
              clockWise={true}
              dataKey="value"
              cornerRadius={30}
              fill="#3b82f6"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-sm text-gray-600">
                        {data.streak} / {data.goal} days ({data.value}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-center text-sm">
        <div className="flex items-center justify-center gap-2 font-medium">
          {isTrendingUp ? (
            <>
              Great Progress! <TrendingUp className="h-4 w-4 text-green-600" />
            </>
          ) : (
            <>
              Keep Going! <TrendingUp className="h-4 w-4 text-blue-600" />
            </>
          )}
        </div>
        <div className="text-muted-foreground">
          {progressToGoal}% to next milestone ({goal} days)
        </div>
        <div className="text-lg font-bold text-blue-600">
          {current} day{current !== 1 ? "s" : ""} streak
        </div>
      </CardFooter>
    </Card>
  );
}
