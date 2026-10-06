# Deployment
- Database: MongoDB Atlas (free tier). Allow the API host's IPs.
- Backend: Render web service, root `backend`, start `npm start`, set env vars from `.env.example`.
- Frontend: Vercel, root `frontend`, build `npm run build`, set `VITE_API_URL`.
- Set `CLIENT_URL` on the backend to the Vercel URL for CORS.
