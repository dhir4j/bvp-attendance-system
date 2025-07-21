# **App Name**: BVP Student Attendance

## Core Features:

- Login: Login screen with username and password fields for teacher authentication.
- Subject Dashboard: Dashboard displaying a list of subjects/sections taught by the teacher. Tapping navigates to attendance marking.
- Attendance Marking: Attendance entry screen with lecture selector (dropdown or segmented control) and date picker, defaulting to the current date. Includes a list of all the enrolled students.
- Absent Student Input: Input so teachers can add absent student roll numbers
- Review and Confirm: Table preview showing student roll number, name, and present/absent toggle. Sticky footer with cancel and submit buttons, indicating the count of absentees.
- Success Feedback: Full-screen toast or modal indicating successful attendance recording with a green check icon.
- Defaulter Extraction: Feature to extract students who have less than 75% attendance i.e defaulters subject wise

## Style Guidelines:

- Primary color: Soft blue (#A0C4FF) for a calm and professional feel.
- Background color: Light gray (#F5F5F5) for an airy and minimalist layout.
- Accent color: Muted purple (#BDB2FF) for buttons and interactive elements.
- Body and headline font: 'PT Sans' for clear readability and a modern aesthetic.
- Use simple line icons to represent actions and navigation elements.
- Employ a responsive design with a two-column layout on desktop and a single-column layout on mobile. Ensure generous white space throughout the interface.
- Subtle transitions and animations for feedback, such as a toast notification when attendance is recorded successfully.