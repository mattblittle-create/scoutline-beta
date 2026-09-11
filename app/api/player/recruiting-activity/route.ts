// app/api/player/recruiting-activity/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sinceDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

type RecentActivityItem = {
  id: string;
  type: "PROFILE_VIEW" | "BOARD_ADD" | "LIST_ADD";
  programName: string;
  division: string | null;
  createdAt: string;
  label: string;
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.id && !user?.email) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const playerProfile = await prisma.playerProfile.findFirst({
      where: {
        OR: [
          user.id ? { userId: user.id } : {},
          user.email ? { email: user.email } : {},
        ],
      },
      select: {
        id: true,
      },
    });

    if (!playerProfile) {
      return NextResponse.json({
        ok: true,
        data: {
          totalCoachViews: 0,
          uniquePrograms: 0,
          totalBoardAdds: 0,
          totalListAdds: 0,
          recentPrograms: [],
          recentActivity: [],
        },
      });
    }

    const viewedAfter = sinceDays(30);

    const [views, boardAdds, listAdds] = await Promise.all([
      prisma.profileViewEvent.findMany({
        where: {
          playerProfileId: playerProfile.id,
          viewedAt: {
            gte: viewedAfter,
          },
          viewerType: "COLLEGE_COACH",
        },
        select: {
          id: true,
          viewedAt: true,
          collegeId: true,
          college: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
        },
        orderBy: {
          viewedAt: "desc",
        },
        take: 100,
      }),

      prisma.recruitingBoardEntry.findMany({
        where: {
          playerProfileId: playerProfile.id,
          createdAt: {
            gte: viewedAfter,
          },
        },
        select: {
          id: true,
          createdAt: true,
          college: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      }),

      prisma.recruitingListMember.findMany({
        where: {
          playerProfileId: playerProfile.id,
          createdAt: {
            gte: viewedAfter,
          },
        },
        select: {
          id: true,
          createdAt: true,
          list: {
            select: {
              name: true,
              college: {
                select: {
                  id: true,
                  name: true,
                  division: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      }),
    ]);

    const programMap = new Map<
      string,
      {
        name: string;
        division: string | null;
        lastViewedAt: string;
        views: number;
      }
    >();

    for (const view of views) {
      const key = view.college?.id || view.college?.name || "unknown";
      const name = view.college?.name || "A college program";

      const existing = programMap.get(key);

      if (existing) {
        existing.views += 1;
      } else {
        programMap.set(key, {
          name,
          division: view.college?.division || null,
          lastViewedAt: view.viewedAt.toISOString(),
          views: 1,
        });
      }
    }

    const recentPrograms = Array.from(programMap.values()).slice(0, 4);

    const recentActivity: RecentActivityItem[] = [
      ...views.map((view) => ({
        id: view.id,
        type: "PROFILE_VIEW" as const,
        programName: view.college?.name || "A college program",
        division: view.college?.division || null,
        createdAt: view.viewedAt.toISOString(),
        label: "Viewed your profile",
      })),

      ...boardAdds.map((entry) => ({
        id: entry.id,
        type: "BOARD_ADD" as const,
        programName: entry.college?.name || "A college program",
        division: entry.college?.division || null,
        createdAt: entry.createdAt.toISOString(),
        label: "Added you to a recruiting board",
      })),

      ...listAdds.map((entry) => ({
        id: entry.id,
        type: "LIST_ADD" as const,
        programName: entry.list?.college?.name || "A college program",
        division: entry.list?.college?.division || null,
        createdAt: entry.createdAt.toISOString(),
        label: `Added you to ${entry.list?.name || "a recruiting list"}`,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return NextResponse.json({
      ok: true,
      data: {
        totalCoachViews: views.length,
        uniquePrograms: programMap.size,
        totalBoardAdds: boardAdds.length,
        totalListAdds: listAdds.length,
        recentPrograms,
        recentActivity,
      },
    });
  } catch (err: any) {
    console.error("PLAYER_RECRUITING_ACTIVITY_ERROR", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Could not load recruiting activity." },
      { status: 500 }
    );
  }
}