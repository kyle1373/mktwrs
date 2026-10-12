export default {
  poweredByHeader: false,
  // Enable only after scripts/r2-media.py verify passes for the complete inventory.
  async redirects() {
    return process.env.MKTWRS_MEDIA_ORIGIN ? [{
      source: "/assets/:path*",
      destination: `${process.env.MKTWRS_MEDIA_ORIGIN.replace(/\/$/, "")}/assets/:path*`,
      permanent: false,
    }] : [];
  },
  experimental: {
    // Railway restored a corrupted persistent Turbopack build cache.
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};
