# Development Prompt: Build "Unsent" — Emotional Connection Platform

## Role

You are a senior full-stack developer and software architect.

Your task is to design and develop a production-ready web application called **"Unsent"**.

The goal is to create a public portfolio project that will be deployed online using **Vercel**.

Before writing any code, you must first analyze the entire project concept and provide the recommended **folder structure and architecture**.

Do not start implementation until the structure is planned.

---

# Phase 1: Analyze and Provide Folder Structure First

Before writing code, provide:

- Complete project folder structure
- Explanation of each folder
- Recommended architecture
- Data flow
- Feature organization
- Scalability considerations

The structure must support:

- Authentication
- User profiles
- Anonymous posting
- Emotional analysis
- Matching algorithm
- Real-time messaging
- Garden progression system
- Database management
- Future expansion

The folder structure must follow:

- Clean architecture
- Feature-based organization
- Separation of concerns
- Maintainability
- Production standards

---

# Deployment Requirement

The application will be deployed using:

**Vercel**

The architecture must be optimized for Vercel deployment.

Consider:

- Serverless functions
- API routes
- Server actions
- Environment variables
- Database connection handling
- Performance optimization

Avoid using:

- Long-running servers
- Local file storage
- Architecture that requires constant backend processes

---

# Recommended Technology Direction

Use a Vercel-friendly full-stack architecture.

Preferred stack:

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion or similar animation library

## Backend

Use:

- Next.js API Routes
- Server Actions
- Server-side utilities

Avoid separating frontend and backend unless necessary.

## Database

Use:

- PostgreSQL
- Prisma ORM

The database should support:

- Users
- Anonymous identities
- Letters
- Emotions
- Seeds
- Garden growth
- Matches
- Messages

---

# Application Concept

Build an application called:

# Unsent

The core idea:

> "Some words are too heavy to keep inside. Release them, and discover someone else who understands."

The platform allows people to anonymously write letters that they never had the chance to say.

Examples:

- Messages for someone they loved
- Messages for someone they lost
- Regrets
- Forgiveness
- Memories
- Feelings they cannot express

The application is focused on:

- Emotional expression
- Reflection
- Healing
- Anonymous connection

This is NOT:

- A dating application
- A normal social media clone
- A popularity-based platform

---

# Main User Experience

When users open the application, the first experience should feel calm and reflective.

Example:

"Some words are too heavy to carry alone."

Then ask:

"What are you carrying today?"

Options:

- Something I lost
- Something hurting me
- Something I miss
- Something I'm healing from
- Something I never said

---

# Feature 1: Anonymous Letter System

Users can write anonymous letters.

Each letter contains:

- Anonymous identity
- Content
- Emotion category
- Emotional intensity
- Date created
- Privacy settings

Example:
Anonymous:

"I hope you are happy,
even if I am no longer part of your life."

---

# Feature 2: Emotional Garden System

Create a gamification system called:

## Emotional Garden

Important rule:

A seed does NOT represent one letter.

A seed represents an emotional journey.

Example:

User writes:

"I miss them."

The system creates:
Seed:

Missing Someone

---

When the user writes another related letter:

"I still check their profile."

The same seed grows:
Seed Growth:

🌱 → 🌿

---

When the user reaches acceptance:

"I finally accepted what happened."

The seed evolves:

🌿 → 🌸

---

The garden represents the user's emotional growth.

Example:
My Garden:

🌹 Letting Go
12 letters
Bloomed

🌱 New Beginning
4 letters
Growing

🌳 Self Forgiveness
20 letters
Strong Tree

---

# Feature 3: Emotion Analysis System

Every letter should be analyzed.

Example:

Input:
"I cannot stop thinking about them."


Output:

```json
{
  "emotion": "longing",
  "intensity": 0.87,
  "category": "past_relationship"
}

Possible emotions:

Love
Longing
Regret
Sadness
Anger
Forgiveness
Acceptance
Healing
Hope

# Feature 4: Emotional Matching System

Create a system that connects users based on emotional similarity.

This is NOT dating.

The purpose:

"Find someone who understands your experience."

Example:

User A:

"I keep waiting for a message that will never arrive."

User B:

"I still check my phone hoping they text me."

The system detects:
Similarity: 89%

Then:

"You found someone who understands this feeling."

Feature 5: Anonymous Support Interaction

Avoid normal social media interactions.

Do NOT use:

Likes
Followers
Popularity ranking

Use:

I understand
I felt this
I hope you're okay
Thank you for sharing
Feature 6: Healing Progress System

Track emotional growth.

Example:

Beginning:

"I cannot move on."

Later:

"I learned something from it."

Stages:
🌱 Beginning

🌿 Growing

🌸 Healing

🌳 Strong

Feature 7: User Profile

Profiles should represent growth.

Example:
Anonymous Garden

Seeds planted: 15

Growing journeys: 6

Healed memories: 4

Letters written: 120

Main Application Pages
Home / River

Anonymous letter feed.

Users browse stories.

Write Letter

A writing space.

Options:

Who is this for?

Someone I loved
Someone I lost
My past self
Someone I hurt
Someone I forgive
Myself
Garden

Visual emotional progress.

Displays:

Seeds
Plants
Growth stages
Emotional chapters
Matches

Shows users with similar emotional experiences.

Allow anonymous conversation.

Design Direction

The interface should feel:

Warm
Calm
Hopeful
Emotional

Avoid:

Dark depressing design
Aggressive social media style

Use:

Floating letters
Paper effects
Smooth animations
Growing plants
Peaceful visuals

The user feeling should be:

"I came here hurting, and I leave feeling lighter."

AI Processing Flow

The system should process letters asynchronously.

Flow:
User writes letter

↓

Save letter

↓

Analyze emotion

↓

Update seed

↓

Update garden

↓

Update matching system

Do not block the user while processing.

Real-Time Features

Because the application is deployed on Vercel:

Do not depend on permanent WebSocket servers.

For:

Messages
Notifications
Updates

Use:

Server actions
External realtime services
Database-based updates
Final Development Goal

Build this as a portfolio-quality application.

The final project should demonstrate:

Full-stack development
Modern UI/UX
Database design
Authentication
AI integration
Recommendation algorithm
Real-time features
Production deployment