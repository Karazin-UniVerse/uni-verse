---
feature: Opportunities board
project: opportunities
status: draft
origin: idea
notion: https://app.notion.com/p/Opportunities-3e9f8cf15c6180ccac54f05ad10c62eb
---

# Opportunities board

## Goal

Students and staff publish "opportunities" (projects, internships, offers) and find and apply to them in one place. Moderators check every opportunity before it becomes visible, so the catalog stays trustworthy.

## Scope

In: creating and moderating opportunities, the catalog with a filter and search, applying and managing applications, notifications, paid and unpaid opportunities, hiding an opportunity from the catalog.

Out: managing moderators through an administrator role (moderators are assigned manually in the database for now), a separate notifications page (notifications are listed in the portal header), notifications about deletions, a moderation history log (only the latest moderator comment is kept), application fields defined by the owner (the form is fixed), the user profile (owned by the portal), the split of the work into pull requests.

## Requirements

### REQ-OPP-01 (must) Create an opportunity

As a signed-in user, I create an opportunity so that others can find it.

- REQ-OPP-01.1 The form requires title, description, owner contact information and payment type (paid or unpaid). The owner's information (name, corporate email) is filled in from their profile.
- REQ-OPP-01.2 A form with a required field empty is not saved and shows which field is missing.
- REQ-OPP-01.3 A saved opportunity is a draft and does not appear in the catalog.
- REQ-OPP-01.4 For a paid opportunity the owner may add payment details as free text; an unpaid opportunity shows that it is unpaid.

---

### REQ-OPP-02 (must) Submit for review and revise

As an owner, I send a draft to moderation and revise it when the moderator asks.

- REQ-OPP-02.1 An owner can submit a draft for review.
- REQ-OPP-02.2 After submission the owner cannot change the content until the moderator decides, except when the moderator returned it for changes.
- REQ-OPP-02.3 An owner can edit an opportunity returned for changes and submit it again.
- REQ-OPP-02.4 A rejected opportunity cannot be edited or submitted again.
- REQ-OPP-02.5 An owner can edit a published opportunity. The edit sends it back to ready for review and hides it from the catalog until a moderator approves it again.

---

### REQ-OPP-03 (must) Moderate an opportunity

As a moderator, I approve, return or reject opportunities submitted for review.

- REQ-OPP-03.1 Only opportunities submitted for review can be moderated.
- REQ-OPP-03.2 Approving makes the opportunity published and visible in the catalog, and clears the earlier moderator comment.
- REQ-OPP-03.3 Returning for changes requires a comment, sets the status to requires changes and notifies the owner.
- REQ-OPP-03.4 Rejecting requires a comment, sets the status to rejected, which is final, and notifies the owner.
- REQ-OPP-03.5 Users without the moderator role cannot moderate. The role is checked against current data on every request, so a removed role stops working at once.

---

### REQ-OPP-04 (should) Hide a published opportunity (moderator)

As a moderator, I take a published opportunity out of the catalog.

- REQ-OPP-04.1 A moderator can hide a published opportunity from the moderation tab.
- REQ-OPP-04.2 Hiding only removes the opportunity from the catalog for ordinary users and stops new applications; the opportunity, its moderation status, its phase and its applications are kept.
- REQ-OPP-04.3 An opportunity hidden by a moderator can be made visible again only by a moderator.

---

### REQ-OPP-05 (must) Browse the catalog

As a user, I see all published opportunities with brief information.

- REQ-OPP-05.1 For an ordinary user the catalog lists published, visible opportunities only.
- REQ-OPP-05.2 Each card shows title, description, owner, creation date and current status.
- REQ-OPP-05.3 An empty catalog shows an empty-state message, not a blank page.
- REQ-OPP-05.4 A moderator can view all opportunities in a separate moderation tab and filter them by moderation status.
- REQ-OPP-05.5 The catalog, the details of an opportunity and the opportunity lists are available only to signed-in users.

---

### REQ-OPP-06 (must) Filter the catalog

As a user, I narrow the catalog down.

- REQ-OPP-06.1 The list can be filtered by payment type: all, paid, unpaid.
- REQ-OPP-06.4 The list can be filtered by phase (REQ-OPP-09), which is not the same as the moderation status.
- REQ-OPP-06.5 When a filter or a search matches nothing, the message says nothing matched, which differs from the empty-catalog message.

---

### REQ-OPP-07 (must) Opportunity details

As a user, I open an opportunity to read everything about it.

- REQ-OPP-07.1 The page shows title, full description, creation date, last-changed date, owner, contact information, current status and payment information.
- REQ-OPP-07.2 Moderators also see the latest moderator comment; the moderation actions are in the moderation tab.
- REQ-OPP-07.3 An opportunity that is not published is shown only to its owner and to moderators.

---

### REQ-OPP-08 (must) My opportunities

As an owner, I see and manage the opportunities I created.

- REQ-OPP-08.1 The page lists only the user's own opportunities with title, creation date, status and last-changed date.
- REQ-OPP-08.2 For an opportunity returned for changes, the moderator's comment is shown.
- REQ-OPP-08.3 A draft and an opportunity returned for changes can be opened, edited and submitted. A published one can be opened and edited (REQ-OPP-02.5). One submitted for review and a rejected one can only be opened.
- REQ-OPP-08.4 The owner can reach the applications received for each of their opportunities (REQ-OPP-12).

---

### REQ-OPP-09 (must) Moderation status, phase and visibility

As a user, I can tell whether an opportunity has passed review, what stage it is in and whether it is shown.

- REQ-OPP-09.1 Every opportunity has a moderation status: draft, ready for review, requires changes, published, rejected.
- REQ-OPP-09.2 Every opportunity has a phase: start (the default), active, paused, completed, cancelled. The owner can change the phase at any moderation status.
- REQ-OPP-09.3 Moderation status, phase and visibility are three separate values and are never mixed into one.
- REQ-OPP-09.4 Visibility is one of: visible (the default), hidden by owner, hidden by moderator. It applies to published opportunities.

---

### REQ-OPP-10 (must) Apply to an opportunity

As a user, I apply to a published opportunity.

- REQ-OPP-10.1 A published, visible opportunity in the start or active phase has an apply button.
- REQ-OPP-10.2 The application form asks for contact information and motivation; name and corporate email come from the profile (REQ-OPP-10.4).
- REQ-OPP-10.3 After sending, the applicant is notified, and so is the owner.
- REQ-OPP-10.4 The applicant's name and corporate email are filled in from their profile.
- REQ-OPP-10.5 An owner cannot apply to their own opportunity, and the server refuses it too.
- REQ-OPP-10.6 A user can apply to the same opportunity only once, also after withdrawing.

---

### REQ-OPP-11 (must) My applications

As an applicant, I track what happens with each application.

- REQ-OPP-11.1 The page lists the user's applications with opportunity title, owner, date sent, current status, last-changed date and the owner's comment, if any.
- REQ-OPP-11.2 An application has one of the statuses: sent, under review, accepted, rejected, withdrawn.
- REQ-OPP-11.3 The applicant can open the details of an application.
- REQ-OPP-11.4 The applicant can withdraw an application until the owner has accepted or rejected it, and its status becomes withdrawn. A withdrawn application cannot be changed.

---

### REQ-OPP-12 (must) Manage applications

As an owner, I decide on the applications to my opportunity.

- REQ-OPP-12.1 An owner sees the applications only to their own opportunities.
- REQ-OPP-12.2 An owner sees the list of applicants and the details of each application, including the contact the applicant typed and their corporate email. The owner can set an application to under review, accepted or rejected, with an optional comment, and can change a decision later.
- REQ-OPP-12.3 A moderator can view all applications, read-only.

---

### REQ-OPP-13 (must) Notifications

As a user, I am told about important changes.

- REQ-OPP-13.1 The user is notified when their opportunity is submitted for review, approved, returned for changes or rejected.
- REQ-OPP-13.2 The notifications of the portal are listed in the notification list in the header, together with the other portal notifications; each has a short description and a link to the opportunity.
- REQ-OPP-13.3 Notifications are shown in Ukrainian and English.
- REQ-OPP-13.4 A notification is either read or unread.

---

### REQ-OPP-14 (could) Moderator notifications

As a moderator, I learn about work waiting for me.

- REQ-OPP-14.1 A moderator is notified when a user creates a new opportunity, submits one again, changes one, or when a published one is hidden.

---

### REQ-OPP-15 (must) Access and roles

As the platform, I let each role do only what it should.

- REQ-OPP-15.1 Users sign in only with a corporate account through Google; an account outside the corporate domain cannot sign in. The sign-in methods are owned by the SSO work.
- REQ-OPP-15.2 After sign-in the platform knows the user's role, and roles are checked against current data on every request. A moderator has everything an ordinary user has, plus moderation (REQ-OPP-03, REQ-OPP-04).
- REQ-OPP-15.3 A user can change only their own opportunities and applications.
- REQ-OPP-15.4 When the platform's feature toggle is off, the platform is not shown in the portal and its pages cannot be reached.

---

### REQ-OPP-16 (must) Search the catalog

As a user, I find an opportunity by typing.

- REQ-OPP-16.1 Typing part of a title, description, owner name, owner email or owner contact information shows the matching opportunities.

---

### REQ-OPP-17 (should) Hide my own opportunity

As an owner, I take my published opportunity out of the catalog myself.

- REQ-OPP-17.1 An owner can hide their own published opportunity.
- REQ-OPP-17.2 The effect is the same as a moderator hiding it (REQ-OPP-04.2).
- REQ-OPP-17.3 The owner can make it visible again, unless a moderator hid it.

## Non-functional

- All user-facing text exists in Ukrainian and English.
- Owner and applicant contact information is personal data: the catalog requires sign-in (REQ-OPP-05.5), an owner sees the contact and email only of applicants to their own opportunities, and moderators see applications read-only.

## Intersections

- Sign-in with a corporate Google account: the SSO work (Notion "Draft of investigation on SSO" and "SSO investigation (UniAuth)"). Removing the Moodle-credential sign-in must first solve how a Google user gets a Moodle token.
- The portal navigation and the platform feature toggle in the UniHub dashboard (the flag `isOpportunitiesPlatformEnabled` in the core constants).
- Roles: the moderator role `OPPORTUNITIES_MODERATOR`, used only by this feature. The core roles also contain a general `ADMIN` that is not the "Admin (main moderator)" of the Notion improvements.
- Notifications: the backend notifications service and the notification list in the dashboard header, shared with other features (the header list currently shows Moodle notifications only).
- Shared data: users and roles, and the opportunity, application, comment and notification models in the database package.
- Talent Profile: the Notion page "Улучшения/Импрувмент", item 10, says it is connected with Opportunities; the relation is not defined.
- Sources: Notion "Перечень функционала Uni Opportunities" (feature list) and "opportunities_erd" (data model), both under the Opportunities project page.

## Open questions

- Which contact details besides the corporate email in the profile does the owner type in at creation? The source also says more creation fields are "to be defined later".
- Does "current status" on a catalog card mean the phase, since every listed item is published?
- When a moderator hides an opportunity, is the owner notified? What happens to existing applications of a hidden, paused, cancelled or completed opportunity: can the owner still decide on them?
- Should an owner be able to delete an opportunity instead of, or as well as, hiding it, and what then happens to its applications? Can users delete applications?
- Confirm that the owner is told about a new application and the applicant about every status change of their application (the code already does both).
- What marks a notification as read: opening it or a separate action?
- May a moderator moderate their own opportunity? Is the Notion "Admin (main moderator)" the same as the existing administrator role?
- Are there rules for free text (description, comments, motivation) and for limiting the number of applications, to prevent abuse?
- Improvements for later: application fields defined by the owner, a moderation history log, structured payment details (amount, currency, periodicity), what "payment details: private message (clickable)" opens, where the list of opportunities a user takes part in is shown.
