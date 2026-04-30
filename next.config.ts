import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/essdee-kid-mask.pdf",
        headers: [
          {
            key: "Content-Disposition",
            value: 'attachment; filename="essdee kid mask.pdf"',
          },
          {
            key: "Content-Type",
            value: "application/pdf",
          },
        ],
      },
      {
        source: "/lunch-bells.pdf",
        headers: [
          {
            key: "Content-Disposition",
            value: 'attachment; filename="lunch bells.pdf"',
          },
          {
            key: "Content-Type",
            value: "application/pdf",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
