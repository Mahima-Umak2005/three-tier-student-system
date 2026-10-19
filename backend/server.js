/** @format */

const allowed = [
  process.env.FRONTEND_URL,
  ...(process.env.EXTRA_ORIGINS || "").split(","),
]
  .map((o) => o && o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes(origin.replace(/\/+$/, ""))) {
        return cb(null, true);
      }

      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
