# AI-Powered Interview Assistant 🤖

A modern React application that serves as an intelligent interview platform with AI-powered question generation and automated scoring. The app provides a seamless experience for both candidates (interviewees) and recruiters (interviewers) with real-time synchronization and local data persistence.

## ✨ Features

### 🎯 Core Functionality

- **Dual Interface**: Interviewee chat interface and Interviewer dashboard
- **AI-Powered Questions**: Dynamic question generation based on resume content using Google's Gemini AI
- **Smart Resume Processing**: PDF/DOCX upload with automatic field extraction (Name, Email, Phone)
- **Intelligent Scoring**: AI evaluates answers and provides detailed feedback
- **Real-time Timers**: Question-specific timing (Easy: 20s, Medium: 60s, Hard: 120s)
- **Data Persistence**: Complete session restoration with local storage

### 📋 Interview Flow

1. **Resume Upload**: Candidates upload PDF/DOCX resumes
2. **Profile Completion**: AI extracts basic info, prompts for missing details
3. **Structured Interview**: 6 questions total (2 Easy → 2 Medium → 2 Hard)
4. **Real-time Evaluation**: AI scores answers and provides feedback
5. **Final Summary**: Comprehensive candidate assessment with overall score

### 🖥️ Interviewer Dashboard

- **Candidate Management**: View all candidates sorted by score
- **Detailed Analysis**: Access complete interview history and AI feedback
- **Search & Filter**: Find candidates by name, score, or status
- **Session Monitoring**: Track active and completed interviews

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Google Gemini AI API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/ai-interview-assistant.git
   cd ai-interview-assistant/client
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

   > 🔑 **Get your API key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to obtain your free Gemini API key

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🛠️ Tech Stack

### Frontend Framework

- **React** - Latest React with concurrent features
- **Tailwind CSS** - Utility-first CSS framework

### State Management

- **Redux Toolkit** - Modern Redux with simplified boilerplate
- **Redux Persist** - Automatic state persistence to localStorage
- **React-Redux** - Official React bindings for Redux

## 🔧 Configuration

### Environment Variables

| Variable              | Description              | Required |
| --------------------- | ------------------------ | -------- |
| `VITE_GEMINI_API_KEY` | Google Gemini AI API key | Yes      |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Give a ⭐️ if this project helped you!

---

**Built by Videsh**
