Blender

Role
	You are the world's leading AI coder. You have experience from the startup scene and have attended Slush multiple times. You are an expert at coding in all major programming languages. You are in charge of producing the exact outcome your customers (me) are looking for.
	You have deep expertise in building scalable, double-sided matchmaking platforms (like a B2B dating app for venture capital) and designing highly engaging core game loops for non-gaming software. You intimately understand the European startup ecosystem, VC deal-flow dynamics, and how founders pitch. You are technically pragmatic, focusing on rapid MVP deployment, seamless UX/UI, and scalable backend architecture.

Context
"The Challenge
Build a tool that makes Slush more valuable for the founders and investors who attend it.

Every year, thousands of founders and investors come to Helsinki for two days of Slush. Everyone arrives with the same goal: meet the right people, have the conversations that matter, and leave with momentum. But with a packed venue, a dense program, and thousands of attendees competing for the same hours, it is easy to spend the event in the wrong queue, the wrong room, or the wrong meeting. The best connection of the week might be twenty meters away, and you'd never know.
Your mission is to build something that founders, investors, or both can actually use at Slush for a better experience. This could mean smarter matchmaking between founders and the right investors, tools for preparing for or following up on meetings, ways to navigate the program and venue, better ways to capture and act on what happens in hundreds of short conversations, or something entirely new. Pick a real user, understand their pain, and build a working prototype that someone could pick up and use at the next Slush."

Basic Idea
Our solution solves the problem of not being able to meet the right people during Slush and makes connecting founders to investors easier and more efficient. The platform will be used mostly before Slush to fill participants' calendars and streamline connections between founders and investors. We want to create a platform where the founder creates a profile and answers around 7 questions regarding their startup (funding round, business growth, desired level of investor involvement, funding needed, why an investor should invest in the company, etc.). The investor also creates a profile answering basically the same questions in reverse (e.g., How much funding do you want? -> How much funding are you willing to provide?). The profiles should include not only basic information about the founder, but also personality traits and how they align with the investor's personality.

After that, the platform will use an API to leverage AI to rank these profiles’ compatibility. It will generate a personality/collaboration ranking and evaluate how closely the business’s metrics and thesis match the investor's criteria and values. 

Next, the platform will display the best-matched startups in a Tinder-like swiping feed for investors. Investors can swipe to see more information about the startup, view a short 30-second pitch video, review key numbers, and read why they should invest in the company. Swiping right moves the startup profile to the investor's "Liked" tab, where they can subsequently send a calendar meeting invite to the startup.

Visuals
We want the color theme to be semi-minimalist, featuring a dark green background and light text. The theme should look professional, calm, and inviting.

Demo
For the demo, we will build the frontend for everything, but not all functionality needs to be operational. The demo is designed for mobile use and is web-based. It will be hosted locally on a Wi-Fi network.

At the start of the demo, the user selects whether they want to test the demo as a founder, as an investor, or skip straight to swiping. 

What has to work:
- In the screening section, the user answers questions. AI evaluates the answers and/or company websites to generate keywords and details about the company or investor.
- In the swiping section, we will have functional premade profiles. The app can match test companies to demo-tester-created investor profiles. Companies created during the screening phase cannot be added to the swiping feed. The matchmaking logic can be relatively simple, as this is just a demo.
- The Connect page must show companies that were swiped right ("liked").

Workflows
Read prodeko.txt. It’s located in the same directory.

How does each part work?
Screening
Screening asks the user questions depending on their role. After the questions are submitted, an AI API call is made according to specified rules. These rules control how keywords are assigned to the user profile. Once keywords are generated, the user can add or delete them if they feel the keywords are inaccurate. When finished, the user submits their profile.

Questions for founders:
[Questions will be provided later]

Questions for investors:
[Questions will be provided later]

Swiping
Once a user submits their profile, the swiping phase begins. The swiping phase works like Tinder: it displays company profiles that can be swiped to either like or discard them. 

Include a button that navigates to the Connect page. Add a button on the Connect page that leads back to swiping. After every five likes, prompt the user to ask if they want to visit the Connect page.

What does a company profile present?
- Company name
- What they do (maximum 100 characters)
- Current startup stage/phase
- Top matching keywords. Clicking or hovering over keywords displays why the company was assigned that keyword.

If a user interacts with the page (e.g., scrolls down), additional information is revealed:
- What problem the company is trying to solve
- How they are solving the problem
- About their team and experience
- Key numbers
- Optional short video

Connect
On the Connect page, users can view companies they have liked and initiate connections. Clicking a liked company's profile reveals their full profile and contact information.

Test companies
To run the demo, you will need to generate test companies to use during the presentation. The test companies will be provided later.

Ask questions if anything is unclear. Never guess or estimate; always ask specifying questions.