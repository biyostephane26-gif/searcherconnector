# Use Node.js with Playwright pre-installed
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SKIP_ENV_VALIDATION=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js. Le `|| true` a été retiré : il masquait les échecs de build
# (clients Supabase/Stripe qui plantaient au module-level sans les secrets),
# produisant un .next incomplet → "Could not find a production build" au start.
# Les clients sont désormais tolérants au build (fallback clé anon), donc si le
# build échoue vraiment, on veut qu'il échoue ICI, clairement.
RUN npm run build

# Expose port
EXPOSE 3000

# Start app (serveur Next.js + scheduler de scan automatique, même conteneur)
CMD ["npm", "run", "start:all"]
