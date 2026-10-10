import { addHours, addDays, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/constants/booking-status";
import { getAdminSession } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const PAGE_SIZE_MAX = 10;
const DEFAULT_PAGE_SIZE = 10;
const ATTENTION_PENDING_MINUTES = 120;
const ATTENTION_STARTING_SOON_HOURS = 2;

const tabs = [
  "all",
  "needs_action",
  "today",
  "upcoming",
  "completed",
  "cancelled_rejected",
] as const;
type AdminBookingsTab = (typeof tabs)[number];

const sorts = [
  "attention",
  "starts_at_asc",
  "starts_at_desc",
  "created_at_desc",
  "created_at_asc",
  "age_desc",
] as const;
type AdminBookingsSort = (typeof sorts)[number];
const bookingChannels = [
  "web",
  "admin",
  "phone",
  "whatsapp",
  "instagram",
  "tiktok",
  "facebook",
  "partner",
  "api",
  "other",
] as const;
type BookingChannel = (typeof bookingChannels)[number];

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(DEFAULT_PAGE_SIZE),
  tab: z.enum(tabs).default("needs_action"),
  q: z.string().trim().max(200).optional(),
  channel: z.enum(bookingChannels).optional(),
  branch_id: z.string().uuid().optional(),
  specialist_id: z.string().uuid().optional(),
  service_id: z.string().uuid().optional(),
  date_from: z.string().datetime({ offset: true }).optional(),
  date_to: z.string().datetime({ offset: true }).optional(),
  time_window: z.enum(["next_2_hours"]).optional(),
  sort: z.enum(sorts).optional(),
});

type AdminSupabaseClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

type BookingListRow = {
  id: string;
  user_id: string;
  booking_kind: "service" | "package";
  package_id: string | null;
  service_id: string;
  branch_id: string;
  specialist_id: string;
  booking_channel: BookingChannel | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  payment_status: "pending" | "succeeded" | "failed" | "canceled" | null;
  payment_amount_cents: number | null;
  payment_currency: string | null;
  package:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | Array<{
        id: string;
        name: string;
        slug: string;
      }>
    | null;
  service:
    | {
        id: string;
        name: string;
        slug: string;
        min_price_cents: number;
        max_price_cents: number;
        currency: string;
        duration_minutes: number;
      }
    | Array<{
        id: string;
        name: string;
        slug: string;
        min_price_cents: number;
        max_price_cents: number;
        currency: string;
        duration_minutes: number;
      }>
    | null;
  branch:
    | {
        id: string;
        name: string;
        city: string;
        country: string;
        address: string;
      }
    | Array<{
        id: string;
        name: string;
        city: string;
        country: string;
        address: string;
      }>
    | null;
  specialist:
    | {
        id: string;
        name: string;
        title: string;
      }
    | Array<{
        id: string;
        name: string;
        title: string;
      }>
    | null;
};

type SearchTokens = {
  freeText: string;
  statuses: BookingStatus[];
  branchTerms: string[];
  specialistTerms: string[];
  serviceTerms: string[];
  date?: string;
};

function toSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseStatusesFromParams(searchParams: URLSearchParams): BookingStatus[] {
  const raw = [
    ...searchParams.getAll("status"),
    ...searchParams.getAll("status[]"),
    ...(searchParams.get("status")?.split(",") ?? []),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  const allowed = new Set(BOOKING_STATUSES);
  return [...new Set(raw.filter((status): status is BookingStatus => allowed.has(status as BookingStatus)))];
}

function parseSearchTokens(input: string | undefined): SearchTokens {
  if (!input) {
    return {
      freeText: "",
      statuses: [],
      branchTerms: [],
      specialistTerms: [],
      serviceTerms: [],
    };
  }

  const tokenRegex = /([a-z_]+):("[^"]+"|\S+)/gi;
  const statuses: BookingStatus[] = [];
  const branchTerms: string[] = [];
  const specialistTerms: string[] = [];
  const serviceTerms: string[] = [];
  let date: string | undefined;
  const consumed = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(input)) !== null) {
    const key = match[1]?.toLowerCase();
    const rawValue = match[2] ?? "";
    const value = rawValue.replace(/^"(.*)"$/, "$1").trim();
    if (!value) continue;

    consumed.add(match[0]);

    if (key === "status" && (BOOKING_STATUSES as readonly string[]).includes(value)) {
      statuses.push(value as BookingStatus);
      continue;
    }
    if (key === "branch") {
      branchTerms.push(value);
      continue;
    }
    if (key === "specialist") {
      specialistTerms.push(value);
      continue;
    }
    if (key === "service") {
      serviceTerms.push(value);
      continue;
    }
    if (key === "date") {
      date = value;
    }
  }

  let freeText = input;
  consumed.forEach((token) => {
    freeText = freeText.replace(token, " ");
  });

  return {
    freeText: freeText.trim(),
    statuses: [...new Set(statuses)],
    branchTerms,
    specialistTerms,
    serviceTerms,
    date,
  };
}

async function lookupIdsByName(
  supabase: AdminSupabaseClient,
  table: "branches" | "specialists" | "services",
  term: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("id,name")
    .ilike("name", `%${term}%`)
    .limit(50);

  if (error) return [];
  return (data ?? []).map((item) => item.id as string);
}

function getTabDefaults(tab: AdminBookingsTab, now: Date) {
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);

  if (tab === "all") {
    return {
      statuses: [] as BookingStatus[],
      dateFrom: undefined,
      dateTo: undefined,
      sort: "created_at_desc" as AdminBookingsSort,
    };
  }

  if (tab === "today") {
    return {
      statuses: [] as BookingStatus[],
      dateFrom: todayStart.toISOString(),
      dateTo: tomorrowStart.toISOString(),
      sort: "starts_at_asc" as AdminBookingsSort,
    };
  }

  if (tab === "upcoming") {
    return {
      statuses: ["pending", "confirmed", "rescheduled"] as BookingStatus[],
      dateFrom: tomorrowStart.toISOString(),
      dateTo: undefined,
      sort: "starts_at_asc" as AdminBookingsSort,
    };
  }

  if (tab === "completed") {
    return {
      statuses: ["completed"] as BookingStatus[],
      dateFrom: undefined,
      dateTo: undefined,
      sort: "starts_at_desc" as AdminBookingsSort,
    };
  }

  if (tab === "cancelled_rejected") {
    return {
      statuses: ["cancelled", "rejected"] as BookingStatus[],
      dateFrom: undefined,
      dateTo: undefined,
      sort: "created_at_desc" as AdminBookingsSort,
    };
  }

  return {
    statuses: ["pending", "rescheduled"] as BookingStatus[],
    dateFrom: undefined,
    dateTo: undefined,
    sort: "attention" as AdminBookingsSort,
  };
}

function getAttentionMeta(params: {
  status: BookingStatus;
  startsAt: Date;
  createdAt: Date;
  now: Date;
}) {
  const startsInSeconds = Math.floor((params.startsAt.getTime() - params.now.getTime()) / 1000);
  const pendingAgeSeconds = Math.max(
    0,
    Math.floor((params.now.getTime() - params.createdAt.getTime()) / 1000),
  );
  const reasons: string[] = [];
  let priority = 0;

  if (params.status === "pending") {
    if (pendingAgeSeconds >= ATTENTION_PENDING_MINUTES * 60) {
      reasons.push("pending_too_long");
      priority = Math.max(priority, 2);
    }

    if (startsInSeconds >= 0 && startsInSeconds <= ATTENTION_STARTING_SOON_HOURS * 3600) {
      reasons.push("starts_soon_pending");
      priority = Math.max(priority, 3);
    }
  }

  if (params.status === "rescheduled") {
    reasons.push("rescheduled_needs_confirmation");
    priority = Math.max(priority, 1);
  }

  return {
    startsInSeconds,
    pendingAgeSeconds,
    requiresAttention: reasons.length > 0,
    attentionReasons: reasons,
    attentionPriority: priority,
  };
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const now = new Date();
  const searchParams = request.nextUrl.searchParams;
  const query = parsed.data;
  const page = query.page;
  const pageSize = Math.min(query.pageSize, PAGE_SIZE_MAX);
  const tabDefaults = getTabDefaults(query.tab, now);
  const tokens = parseSearchTokens(query.q);
  const explicitStatuses = parseStatusesFromParams(searchParams);
  const sort = query.sort ?? tabDefaults.sort;

  let statuses = explicitStatuses.length > 0 ? explicitStatuses : tabDefaults.statuses;
  if (tokens.statuses.length > 0) {
    statuses = [...new Set([...statuses, ...tokens.statuses])];
  }

  let dateFrom = query.date_from ?? tabDefaults.dateFrom;
  let dateTo = query.date_to ?? tabDefaults.dateTo;

  if (!query.date_from && !query.date_to && tokens.date) {
    const parsedDate = new Date(`${tokens.date}T00:00:00.000Z`);
    if (!Number.isNaN(parsedDate.getTime())) {
      dateFrom = parsedDate.toISOString();
      dateTo = addDays(parsedDate, 1).toISOString();
    }
  }

  const supabase = await createServiceRoleClient("admin_bookings_read");

  const branchIds = new Set<string>(query.branch_id ? [query.branch_id] : []);
  const specialistIds = new Set<string>(query.specialist_id ? [query.specialist_id] : []);
  const serviceIds = new Set<string>(query.service_id ? [query.service_id] : []);

  for (const term of tokens.branchTerms) {
    const ids = await lookupIdsByName(supabase, "branches", term);
    ids.forEach((id) => branchIds.add(id));
  }
  for (const term of tokens.specialistTerms) {
    const ids = await lookupIdsByName(supabase, "specialists", term);
    ids.forEach((id) => specialistIds.add(id));
  }
  for (const term of tokens.serviceTerms) {
    const ids = await lookupIdsByName(supabase, "services", term);
    ids.forEach((id) => serviceIds.add(id));
  }

  let bookingIdsBySearch = new Set<string>();
  const userIdsBySearch = new Set<string>();
  const serviceIdsBySearch = new Set<string>();
  const branchIdsBySearch = new Set<string>();
  const specialistIdsBySearch = new Set<string>();

  if (tokens.freeText) {
    const trimmedText = tokens.freeText.trim();
    const likeValue = `%${trimmedText}%`;

    if (z.string().uuid().safeParse(trimmedText).success) {
      bookingIdsBySearch = new Set([trimmedText]);
    }

    const [profilesRes, servicesRes, branchesRes, specialistsRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("user_id,first_name,last_name,email,phone")
        .or(
          `first_name.ilike.${likeValue},last_name.ilike.${likeValue},email.ilike.${likeValue},phone.ilike.${likeValue}`,
        )
        .limit(100),
      supabase.from("services").select("id,name").ilike("name", likeValue).limit(100),
      supabase.from("branches").select("id,name").ilike("name", likeValue).limit(100),
      supabase.from("specialists").select("id,name").ilike("name", likeValue).limit(100),
    ]);

    (profilesRes.data ?? []).forEach((profile) => userIdsBySearch.add(profile.user_id));
    (servicesRes.data ?? []).forEach((item) => serviceIdsBySearch.add(item.id));
    (branchesRes.data ?? []).forEach((item) => branchIdsBySearch.add(item.id));
    (specialistsRes.data ?? []).forEach((item) => specialistIdsBySearch.add(item.id));
  }

  if (query.branch_id && branchIds.size === 0) {
    return NextResponse.json({
      data: [],
      page,
      pageSize,
      total: 0,
      totalPages: 0,
    });
  }
  if (query.specialist_id && specialistIds.size === 0) {
    return NextResponse.json({
      data: [],
      page,
      pageSize,
      total: 0,
      totalPages: 0,
    });
  }
  if (query.service_id && serviceIds.size === 0) {
    return NextResponse.json({
      data: [],
      page,
      pageSize,
      total: 0,
      totalPages: 0,
    });
  }

  let bookingsQuery = supabase.from("bookings").select(
    "id,user_id,booking_kind,package_id,service_id,branch_id,specialist_id,booking_channel,starts_at,ends_at,status,notes,created_at,guest_name,guest_phone,guest_email,payment_status,payment_amount_cents,payment_currency,package:packages(id,name,slug),service:services(id,name,slug,min_price_cents,max_price_cents,currency,duration_minutes),branch:branches(id,name,city,country,address),specialist:specialists(id,name,title)",
    { count: "exact" },
  );

  if (statuses.length > 0) {
    bookingsQuery = bookingsQuery.in("status", statuses);
  }
  if (query.channel) {
    bookingsQuery = bookingsQuery.eq("booking_channel", query.channel);
  }
  if (dateFrom) {
    bookingsQuery = bookingsQuery.gte("starts_at", dateFrom);
  }
  if (dateTo) {
    bookingsQuery = bookingsQuery.lt("starts_at", dateTo);
  }
  if (branchIds.size > 0) {
    bookingsQuery = bookingsQuery.in("branch_id", [...branchIds]);
  }
  if (specialistIds.size > 0) {
    bookingsQuery = bookingsQuery.in("specialist_id", [...specialistIds]);
  }
  if (serviceIds.size > 0) {
    bookingsQuery = bookingsQuery.in("service_id", [...serviceIds]);
  }
  if (query.time_window === "next_2_hours") {
    bookingsQuery = bookingsQuery
      .gte("starts_at", now.toISOString())
      .lte("starts_at", addHours(now, 2).toISOString());
  }

  if (tokens.freeText) {
    const orParts: string[] = [];
    if (bookingIdsBySearch.size > 0) {
      bookingIdsBySearch.forEach((id) => {
        orParts.push(`id.eq.${id}`);
      });
    }
    if (userIdsBySearch.size > 0) {
      orParts.push(`user_id.in.(${[...userIdsBySearch].join(",")})`);
    }
    if (serviceIdsBySearch.size > 0) {
      orParts.push(`service_id.in.(${[...serviceIdsBySearch].join(",")})`);
    }
    if (branchIdsBySearch.size > 0) {
      orParts.push(`branch_id.in.(${[...branchIdsBySearch].join(",")})`);
    }
    if (specialistIdsBySearch.size > 0) {
      orParts.push(`specialist_id.in.(${[...specialistIdsBySearch].join(",")})`);
    }

    const trimmedText = tokens.freeText.trim();
    const likeValue = `%${trimmedText}%`;
    
    orParts.push(`guest_name.ilike.${likeValue}`);
    orParts.push(`guest_email.ilike.${likeValue}`);
    orParts.push(`guest_phone.ilike.${likeValue}`);

    if (orParts.length === 0) {
      return NextResponse.json({
        data: [],
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      });
    }

    bookingsQuery = bookingsQuery.or(orParts.join(","));
  }

  if (sort === "created_at_desc") {
    bookingsQuery = bookingsQuery.order("created_at", { ascending: false }).order("id", {
      ascending: false,
    });
  } else if (sort === "created_at_asc" || sort === "age_desc") {
    bookingsQuery = bookingsQuery.order("created_at", { ascending: true }).order("id", {
      ascending: true,
    });
  } else if (sort === "starts_at_desc") {
    bookingsQuery = bookingsQuery.order("starts_at", { ascending: false }).order("id", {
      ascending: false,
    });
  } else {
    bookingsQuery = bookingsQuery
      .order("starts_at", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  bookingsQuery = bookingsQuery.range(from, to);

  const { data: bookings, error: bookingsError, count } = await bookingsQuery;
  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 400 });
  }

  const rows = (bookings ?? []) as BookingListRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter((id) => id && id !== "null"))];

  let profileMap = new Map<
    string,
    {
      user_id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
    }
  >();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id,first_name,last_name,email,phone")
      .in("user_id", userIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }

    profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  }

  const data = rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    const pkg = toSingle(row.package);
    const service = toSingle(row.service);
    const branch = toSingle(row.branch);
    const specialist = toSingle(row.specialist);
    const startsAt = new Date(row.starts_at);
    const endsAt = new Date(row.ends_at);
    const createdAt = new Date(row.created_at);
    const durationMinutes = Math.max(
      0,
      Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60)),
    );

    const attention = getAttentionMeta({
      status: row.status,
      startsAt,
      createdAt,
      now,
    });

    return {
      id: row.id,
      booking_kind: row.booking_kind,
      package_id: row.package_id,
      package: pkg
        ? {
            id: pkg.id,
            name: pkg.name,
            slug: pkg.slug,
          }
        : null,
      status: row.status,
      booking_channel: row.booking_channel ?? "web",
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      notes: row.notes,
      created_at: row.created_at,
      duration_minutes: durationMinutes,
      starts_in_seconds: attention.startsInSeconds,
      pending_age_seconds: attention.pendingAgeSeconds,
      requires_attention: attention.requiresAttention,
      attention_reasons: attention.attentionReasons,
      attention_priority: attention.attentionPriority,
      payment_status: row.payment_status ?? null,
      payment_amount_cents: row.payment_amount_cents ?? null,
      payment_currency: row.payment_currency ?? null,
      customer: {
        id: row.user_id,
        name:
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          profile?.email?.split("@")[0] ||
          row.guest_name ||
          "Customer",
        email: profile?.email || row.guest_email || "Unknown",
        phone: profile?.phone || row.guest_phone || null,
      },
      service: {
        id: row.service_id,
        name: service?.name ?? "Service",
        slug: service?.slug ?? "",
        min_price_cents: service?.min_price_cents ?? 0,
        max_price_cents: service?.max_price_cents ?? 0,
        currency: service?.currency ?? "USD",
        duration_minutes: service?.duration_minutes ?? durationMinutes,
      },
      branch: {
        id: row.branch_id,
        name: branch?.name ?? "Branch",
        city: branch?.city ?? "",
        country: branch?.country ?? "",
        address: branch?.address ?? "",
      },
      specialist: {
        id: row.specialist_id,
        name: specialist?.name ?? "Specialist",
        title: specialist?.title ?? "",
      },
    };
  });

  const total = count ?? 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return NextResponse.json({
    data,
    page,
    pageSize,
    total,
    totalPages,
  });
}
