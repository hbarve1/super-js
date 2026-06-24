// @superjs/types-nextjs — narrow hand-curated SJS bindings for Next.js 14.x App Router.

export type Metadata {
  title: string;
  description: string;
  keywords: string[];
}

export type RouteContext<P> {
  params: P;
}

export type NextRequest {
  url: string;
  method: string;
  headers: dynamic;
  nextUrl: dynamic;
  cookies: dynamic;
  json(): Promise<dynamic>;
  text(): Promise<string>;
}

export type NextResponse {
  status: number;
  headers: dynamic;
  cookies: dynamic;
  json(body: dynamic): NextResponse;
  text(body: string): NextResponse;
  redirect(url: string): NextResponse;
}

export type RouteHandler<P> = (
  request: NextRequest,
  context: RouteContext<P>,
) => Promise<NextResponse> | NextResponse;

export type PageProps<P> {
  params: P;
  searchParams: dynamic;
}
