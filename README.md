# KMS Election System

A comprehensive online election management system built with Next.js, TypeScript, and Prisma. This system provides secure voting capabilities with OTP authentication, geolocation verification, and real-time election management.

## Features

### 🗳️ **Voting System**
- OTP-based voter authentication
- Geolocation verification for secure voting
- Real-time vote casting with immediate confirmation
- One-time voting per voter with secure tracking

### 👥 **Candidate Management**
- Candidate registration and nomination system
- Admin approval/rejection workflow with reasons
- Comprehensive candidate profiles with manifestos
- Multi-position support (President, Vice President, Secretary, etc.)

### 🏛️ **Admin Dashboard**
- Live election statistics and monitoring
- Candidate nomination review and approval
- Voter list management with regional organization
- Election data export functionality
- Real-time voting analytics

### 🔐 **Security Features**
- End-to-end encrypted voting process
- IP address and user agent tracking
- Geolocation verification
- Secure session management
- Audit trail for all voting activities

### 📊 **Regional Organization**
- 7 different regions (North, South, East, West, Central, Northeast, Northwest)
- Region-based candidate and voter management
- Regional voting statistics

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **UI Components**: Radix UI with custom styling
- **Charts**: Recharts for data visualization

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kms-election
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Update the `.env.local` file with your configuration:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Credentials

### Admin Access
- **Email**: admin@kms-election.com
- **Password**: SecureAdmin123!

### Sample Voters (for OTP testing)
- **Phone**: +1234567891 (John Doe)
- **Phone**: +1234567892 (Jane Smith)
- **Phone**: +1234567893 (Mike Johnson)

*Note: OTP codes are logged to console in development mode*

## Security Features

- **Password Hashing**: All passwords are securely hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive input validation and sanitization
- **File Upload Security**: Secure file upload with type and size validation
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Security Headers**: Comprehensive security headers for XSS and CSRF protection
- **SQL Injection Prevention**: Parameterized queries and input sanitization

## Usage Guide

### For Voters
1. Navigate to the home page
2. Click "Cast Your Vote"
3. Enter your registered phone number
4. Verify OTP sent to your phone
5. Allow location access for verification
6. Select candidates for each position
7. Submit your vote

### For Candidates
1. Click "Register as Candidate" on the home page
2. Fill out the nomination form completely
3. Submit for admin review
4. Wait for approval notification

### For Administrators
1. Sign in with admin credentials
2. Access the admin dashboard
3. Review pending candidate nominations
4. Approve/reject with reasons
5. Monitor election statistics
6. Export election data when needed

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Admin/Candidate login
- `POST /api/voter/send-otp` - Send OTP to voter
- `POST /api/voter/verify-otp` - Verify OTP
- `POST /api/voter/login` - Complete voter login

### Voting
- `GET /api/voter/dashboard` - Get voter dashboard data
- `POST /api/voter/vote` - Cast vote

### Candidate Management
- `POST /api/candidate/register` - Register new candidate
- `GET /api/admin/candidates` - Get all candidates
- `PUT /api/admin/candidates/:id` - Update candidate status

### Admin Dashboard
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/results` - Get election results
- `POST /api/admin/export` - Export election data

## Database Schema

The system uses a comprehensive database schema with the following main entities:

- **Users**: Base user information with role-based access
- **Voters**: Voter-specific data with regional organization
- **Candidates**: Candidate profiles and nomination status
- **Elections**: Election configuration and timing
- **Positions**: Available positions for election
- **Votes**: Secure vote records with audit trail
- **VoterList**: Pre-registered voter database
- **OTP**: Temporary OTP storage for authentication

## Security Considerations

- All votes are encrypted and stored securely
- Geolocation verification prevents remote voting abuse
- IP address and user agent tracking for audit trails
- One-time voting enforcement per voter
- Secure session management with JWT tokens
- Input validation and sanitization on all forms

## Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   # Update .env.local for production
   DATABASE_URL="your-production-database-url"
   NEXTAUTH_URL="https://your-domain.com"
   NEXTAUTH_SECRET="strong-random-secret"
   ```

2. **Database Migration**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

3. **Build and Deploy**
   ```bash
   npm run build
   npm start
   ```

### Recommended Hosting Platforms
- Netlify (current)
- AWS Amplify
- DigitalOcean App Platform
- Railway
- Render

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for secure and transparent elections**
