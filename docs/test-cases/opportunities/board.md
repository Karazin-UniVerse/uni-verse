# Test cases: Opportunities board

PRD: docs/prd/opportunities/board.md

Users in the preconditions: owner (an ordinary signed-in user who creates opportunities), applicant (another ordinary user), moderator (a user with the moderator role).

### TC-OPP-01 Create an opportunity with all required fields

- covers: REQ-OPP-01.1, REQ-OPP-01.3
- type: functional
- priority: high
- preconditions: owner is signed in
- steps:
  1. Open the opportunities page and choose create (`opportunities.actions.create`).
  2. Fill title, description, owner contact information and payment type, then save.
- expected: the success message `opportunities.toast.createdDraft` is shown; the new opportunity appears in my opportunities with status `opportunities.status.draft`; the owner's name and corporate email in the opportunity come from the owner's profile; the opportunity is not in the catalog.
- verification: playwright
- automated-at: -

---

### TC-OPP-02 A required field is missing

- covers: REQ-OPP-01.2
- type: error
- priority: high
- preconditions: owner is signed in
- steps:
  1. Open the create form.
  2. Leave one required field empty (repeat for title, description, contact information, payment type) and save.
- expected: nothing is saved, no opportunity is added to my opportunities, and the form shows which field is missing.
- verification: playwright
- automated-at: -

---

### TC-OPP-03 Paid and unpaid opportunities

- covers: REQ-OPP-01.4
- type: functional
- priority: medium
- preconditions: owner is signed in
- steps:
  1. Create a paid opportunity with payment details written as free text (`opportunities.createModal.paymentDetailsLabel`), submit it and have it published.
  2. Create an unpaid opportunity, submit it and have it published.
  3. Open both in the catalog.
- expected: the paid opportunity shows its payment details (`opportunities.detailModal.paidWithDetails`); the unpaid one shows `opportunities.detailModal.unpaid` and no payment details.
- verification: playwright
- automated-at: -

---

### TC-OPP-04 Submit a draft for review

- covers: REQ-OPP-02.1
- type: functional
- priority: high
- preconditions: owner has a draft opportunity
- steps:
  1. Open the draft from my opportunities.
  2. Choose send to review (`opportunities.detailModal.sendToReview`).
- expected: `opportunities.toast.sentToReview` is shown and the status becomes `opportunities.status.readyForReview`.
- verification: playwright
- automated-at: -

---

### TC-OPP-05 Content cannot be changed while waiting for a decision

- covers: REQ-OPP-02.2
- type: state
- priority: high
- preconditions: owner has an opportunity in ready for review
- steps:
  1. As the owner, send an update request (`PUT /opportunities/:id`) that changes the title.
  2. Read the opportunity again.
- expected: the request is refused and the title is unchanged.
- verification: unit
- automated-at: -

---

### TC-OPP-06 Return for changes, edit and submit again

- covers: REQ-OPP-02.3, REQ-OPP-03.3, REQ-OPP-08.2
- type: state
- priority: high
- preconditions: owner has an opportunity in ready for review; moderator is signed in
- steps:
  1. As the moderator, return the opportunity for changes with the comment "Add a deadline".
  2. As the owner, open my opportunities.
  3. Edit the description and submit the opportunity again.
- expected: after step 1 the status is `opportunities.status.requiresChanges` and the owner is notified; in step 2 the comment "Add a deadline" is shown with the opportunity; after step 3 the status is `opportunities.status.readyForReview` again and the edited description is kept.
- verification: playwright
- automated-at: -

---

### TC-OPP-07 A rejection is final

- covers: REQ-OPP-02.4, REQ-OPP-03.4
- type: state
- priority: high
- preconditions: owner has an opportunity in ready for review; moderator is signed in
- steps:
  1. As the moderator, reject it with the comment "Out of scope".
  2. As the owner, try to edit it and to submit it for review again.
- expected: the status is `opportunities.status.rejected` and the owner is notified; both attempts in step 2 are refused and the status stays rejected.
- verification: unit
- automated-at: -

---

### TC-OPP-08 Approving publishes the opportunity and clears the old comment

- covers: REQ-OPP-03.2
- type: functional
- priority: high
- preconditions: owner has an opportunity that was returned with the comment "Add a deadline", edited and submitted again; moderator is signed in
- steps:
  1. As the moderator, open the moderation tab and approve it (`opportunities.moderation.approve`).
  2. As the applicant, open the catalog.
  3. As the owner, open my opportunities.
- expected: `opportunities.toast.approved` is shown; the status is `opportunities.status.published`; the opportunity is in the catalog; the owner no longer sees the comment "Add a deadline".
- verification: playwright
- automated-at: -

---

### TC-OPP-09 Only opportunities submitted for review can be moderated

- covers: REQ-OPP-03.1, REQ-OPP-02.4
- type: error
- priority: medium
- preconditions: moderator is signed in; opportunities exist in draft, requires changes, rejected and published
- steps:
  1. Send each moderation action (approve, return, reject) for each of the four opportunities.
- expected: every request is refused and no status changes; in particular a rejected opportunity cannot be reopened.
- verification: unit
- automated-at: -

---

### TC-OPP-10 Returning and rejecting need a comment

- covers: REQ-OPP-03.3, REQ-OPP-03.4
- type: error
- priority: high
- preconditions: moderator is signed in; two opportunities are in ready for review
- steps:
  1. Choose return for changes (`opportunities.moderation.revise`) on the first one and leave the comment empty; try to confirm.
  2. Do the same with reject (`opportunities.moderation.reject`) on the second one.
  3. Enter a comment in each and confirm.
- expected: steps 1 and 2 are not performed and the statuses stay `opportunities.status.readyForReview`; after step 3 they become `opportunities.status.requiresChanges` and `opportunities.status.rejected` and the owners are notified.
- verification: playwright
- automated-at: -

---

### TC-OPP-11 A user without the moderator role cannot moderate

- covers: REQ-OPP-03.5
- type: error
- priority: high
- preconditions: an opportunity is in ready for review; applicant is signed in
- steps:
  1. As the applicant, send a moderation action for the opportunity.
- expected: the request is refused and the status is unchanged.
- verification: unit
- automated-at: -

---

### TC-OPP-13 A moderator hides a published opportunity

- covers: REQ-OPP-04.1, REQ-OPP-04.2, REQ-OPP-09.4
- type: functional
- priority: medium
- preconditions: a published opportunity with one application exists; moderator is signed in
- steps:
  1. As the moderator, hide the opportunity from the moderation tab.
  2. As the applicant, open the catalog and try to apply to the opportunity by its address.
  3. As the owner, open my opportunities and the applications of that opportunity.
- expected: the opportunity is not in the catalog; applying is refused; its moderation status stays published and its phase is unchanged; the owner still sees it and the application; its visibility shows hidden by moderator.
- verification: playwright
- automated-at: -

---

### TC-OPP-14 An owner hides and shows their own opportunity

- covers: REQ-OPP-17.1, REQ-OPP-17.2, REQ-OPP-17.3, REQ-OPP-09.4
- type: functional
- priority: medium
- preconditions: owner has a published opportunity with one application
- steps:
  1. As the owner, hide the opportunity.
  2. As the applicant, open the catalog.
  3. As the owner, make it visible again.
- expected: after step 1 the visibility shows hidden by owner; in step 2 the opportunity is not in the catalog; after step 3 it is back in the catalog; the moderation status, the phase and the application are the same throughout.
- verification: playwright
- automated-at: -

---

### TC-OPP-15 The catalog lists only published, visible opportunities

- covers: REQ-OPP-05.1
- type: functional
- priority: high
- preconditions: one opportunity in each status exists (draft, ready for review, requires changes, published, rejected), one published opportunity hidden by its owner and one hidden by a moderator; applicant is signed in
- steps:
  1. Open the catalog.
- expected: only the published opportunity that is visible is listed.
- verification: playwright
- automated-at: -

---

### TC-OPP-16 A catalog card shows brief information

- covers: REQ-OPP-05.2
- type: functional
- priority: medium
- preconditions: a published opportunity exists
- steps:
  1. Open the catalog and look at its card.
- expected: the card shows title, description, owner, creation date and current status.
- verification: playwright
- automated-at: -

---

### TC-OPP-17 The catalog is empty

- covers: REQ-OPP-05.3
- type: edge
- priority: medium
- preconditions: no published opportunity exists
- steps:
  1. Open the catalog.
- expected: an empty-state message is shown; the page is not blank.
- verification: playwright
- automated-at: -

---

### TC-OPP-18 A moderator views all opportunities and filters by status

- covers: REQ-OPP-05.4
- type: functional
- priority: medium
- preconditions: one opportunity in each status exists; moderator is signed in
- steps:
  1. Open the moderation tab (`opportunities.tabs.moderation`).
  2. Filter by one moderation status.
- expected: step 1 lists all opportunities whatever their status; step 2 lists only those in that status.
- verification: playwright
- automated-at: -

---

### TC-OPP-19 Filter by payment type

- covers: REQ-OPP-06.1
- type: functional
- priority: medium
- preconditions: published opportunities exist, some paid and some unpaid
- steps:
  1. Open the catalog and choose `opportunities.catalog.filterPaid`.
  2. Choose `opportunities.catalog.filterUnpaid`.
  3. Choose `opportunities.catalog.filterAll`.
- expected: step 1 lists paid ones only, step 2 unpaid ones only, step 3 all of them.
- verification: playwright
- automated-at: -

---

### TC-OPP-22 Filter by phase

- covers: REQ-OPP-06.4
- type: functional
- priority: medium
- preconditions: published opportunities in different phases exist
- steps:
  1. Filter by one phase (for example `opportunities.detailModal.phaseActive`).
- expected: only the opportunities in that phase are listed.
- verification: playwright
- automated-at: -

---

### TC-OPP-23 A filter or search matches nothing

- covers: REQ-OPP-06.5
- type: edge
- priority: low
- preconditions: published opportunities exist
- steps:
  1. Type a text that no opportunity contains in the search box.
  2. Clear it and filter by a phase that no opportunity has.
- expected: in both cases a message says that nothing matched and it differs from the empty-catalog message of TC-OPP-17.
- verification: playwright
- automated-at: -

---

### TC-OPP-24 Search the catalog

- covers: REQ-OPP-16.1
- type: functional
- priority: high
- preconditions: published opportunities with different titles, descriptions, owners and contacts exist
- steps:
  1. Type part of a title in the search box (`opportunities.catalog.searchPlaceholder`).
  2. Replace it with part of a description, of an owner name, of an owner email and of an owner contact.
- expected: each search shows the opportunities that contain the text in that field and no others.
- verification: playwright
- automated-at: -

---

### TC-OPP-25 The details page shows the full information

- covers: REQ-OPP-07.1
- type: functional
- priority: medium
- preconditions: a published paid opportunity exists
- steps:
  1. Open the opportunity from the catalog.
- expected: the page shows title, full description, creation date, last-changed date, owner, contact information, current status and payment information.
- verification: playwright
- automated-at: -

---

### TC-OPP-26 A moderator sees the latest moderator comment

- covers: REQ-OPP-07.2
- type: functional
- priority: medium
- preconditions: an opportunity returned once with the comment "Add a deadline" and then resubmitted exists; moderator and applicant are signed in
- steps:
  1. As the moderator, open the opportunity.
  2. As the applicant, open a published opportunity.
- expected: the moderator sees the latest moderator comment "Add a deadline"; the moderation actions are in the moderation tab, not on this page; the applicant sees no moderator comment.
- verification: playwright
- automated-at: -

---

### TC-OPP-27 An unpublished opportunity is hidden from other users

- covers: REQ-OPP-07.3
- type: error
- priority: high
- preconditions: owner has a draft opportunity; applicant and moderator exist
- steps:
  1. As the applicant, open the draft by its address.
  2. As the owner, open it.
  3. As the moderator, open it.
- expected: step 1 is refused (not found or forbidden); steps 2 and 3 show it.
- verification: unit
- automated-at: -

---

### TC-OPP-28 My opportunities lists only my own

- covers: REQ-OPP-08.1
- type: functional
- priority: medium
- preconditions: owner and applicant each have opportunities
- steps:
  1. As the owner, open my opportunities (`opportunities.tabs.myOpportunities`).
- expected: only the owner's opportunities are listed, each with title, creation date, status and last-changed date.
- verification: playwright
- automated-at: -

---

### TC-OPP-29 Available actions depend on the status

- covers: REQ-OPP-08.3
- type: state
- priority: medium
- preconditions: owner has one opportunity in each of the statuses draft, requires changes, ready for review, rejected, published
- steps:
  1. Open each opportunity from my opportunities and note which actions are offered.
- expected: draft and requires changes offer open, edit and submit; published offers open and edit; ready for review and rejected offer open only.
- verification: playwright
- automated-at: -

---

### TC-OPP-30 The owner reaches the applications of an opportunity

- covers: REQ-OPP-08.4
- type: functional
- priority: medium
- preconditions: owner has a published opportunity with one application
- steps:
  1. Open my opportunities and choose the applications of that opportunity.
- expected: the application is listed.
- verification: playwright
- automated-at: -

---

### TC-OPP-31 Moderation statuses are shown

- covers: REQ-OPP-09.1
- type: functional
- priority: medium
- preconditions: owner has opportunities in draft, ready for review, requires changes, published and rejected
- steps:
  1. Open my opportunities.
- expected: each opportunity shows its own status label (`opportunities.status.draft`, `readyForReview`, `requiresChanges`, `published`, `rejected`).
- verification: playwright
- automated-at: -

---

### TC-OPP-32 Apply to an opportunity

- covers: REQ-OPP-10.1, REQ-OPP-10.2, REQ-OPP-10.3
- type: functional
- priority: high
- preconditions: published, visible opportunities exist in the start and in the active phase; applicant is signed in
- steps:
  1. Open the opportunity in the start phase and choose apply (`opportunities.detailModal.apply`).
  2. Fill in the contact and the motivation and send.
  3. Repeat steps 1 and 2 for the opportunity in the active phase.
- expected: the apply button is present in both phases; the form asks for contact and motivation; after sending, `opportunities.toast.applySuccess` is shown and both the applicant and the owner have a notification.
- verification: playwright
- automated-at: -

---

### TC-OPP-33 My applications shows statuses and details

- covers: REQ-OPP-11.1, REQ-OPP-11.2, REQ-OPP-11.3
- type: functional
- priority: high
- preconditions: applicant has applications in each status: sent, under review, accepted, rejected, withdrawn
- steps:
  1. Open my applications (`opportunities.tabs.myApplications`).
  2. Open the details of one application.
- expected: each application shows opportunity title, owner, date sent, current status (`opportunities.appStatus.*`), last-changed date and the owner's comment if there is one; the details show the opportunity, the date sent, the status and the owner's comment.
- verification: playwright
- automated-at: -

---

### TC-OPP-34 Withdraw an application

- covers: REQ-OPP-11.4
- type: state
- priority: medium
- preconditions: applicant has three applications: one in sent, one accepted, one rejected
- steps:
  1. Withdraw the application in sent (`opportunities.myApplications.withdrawBtn`) and confirm (`opportunities.confirm.withdrawConfirm`).
  2. Try to withdraw the accepted and the rejected one.
  3. As the owner, try to change the withdrawn application.
- expected: step 1 shows `opportunities.toast.withdrawn` and `opportunities.appStatus.withdrawn`; the attempts in step 2 are refused; the owner cannot change the withdrawn application.
- verification: playwright
- automated-at: -

---

### TC-OPP-35 An owner decides on applications

- covers: REQ-OPP-12.2
- type: functional
- priority: high
- preconditions: owner has an opportunity with two applications in sent; the applicant typed the contact "@applicant" in the form
- steps:
  1. Open the applications of the opportunity and view the details of the first one.
  2. Set it to under review, then to accepted with the comment "Welcome", then to rejected.
  3. Set the second one to rejected without a comment.
- expected: the details show the contact "@applicant" and the applicant's corporate email; the first application shows `opportunities.appStatus.underReview`, then `opportunities.appStatus.accepted` with the comment visible to the applicant, then `opportunities.appStatus.rejected`; the second shows `opportunities.appStatus.rejected`.
- verification: playwright
- automated-at: -

---

### TC-OPP-36 Other people cannot read an owner's applications

- covers: REQ-OPP-12.1
- type: error
- priority: high
- preconditions: owner has an opportunity with an application; a third user is signed in
- steps:
  1. As the third user, request the applications of the owner's opportunity.
- expected: the request is refused and no application data is returned.
- verification: unit
- automated-at: -

---

### TC-OPP-37 A moderator views all applications read-only

- covers: REQ-OPP-12.3
- type: functional
- priority: medium
- preconditions: an opportunity with an application exists; moderator is signed in
- steps:
  1. As the moderator, request the applications of that opportunity.
  2. As the moderator, try to change the status of one application.
- expected: step 1 returns the applications; step 2 is refused.
- verification: unit
- automated-at: -

---

### TC-OPP-38 Notifications about the moderation of my opportunity

- covers: REQ-OPP-13.1
- type: functional
- priority: high
- preconditions: owner is signed in; moderator is signed in
- steps:
  1. As the owner, submit an opportunity.
  2. As the moderator, return it for changes; after the owner resubmits it, approve it.
  3. Submit another opportunity; as the moderator, reject it.
- expected: the owner receives a notification for each event: submitted, returned for changes, approved, rejected.
- verification: playwright
- automated-at: -

---

### TC-OPP-39 Portal notifications in the header list

- covers: REQ-OPP-13.2, REQ-OPP-13.4
- type: functional
- priority: medium
- preconditions: owner has unread notifications about opportunities; the user also has Moodle notifications
- steps:
  1. Open the notification list in the header.
  2. Follow the link of one opportunity notification.
  3. Open the list again.
- expected: the list shows the opportunity notifications together with the other portal notifications, each with a short description and a link to the opportunity; each notification shows whether it is read; the followed one is marked read (to be confirmed by the team) and the others stay unread.
- verification: playwright
- automated-at: -

---

### TC-OPP-40 Notification texts in both languages

- covers: REQ-OPP-13.3
- type: functional
- priority: low
- preconditions: owner has notifications
- steps:
  1. Open the notifications page with the Ukrainian interface.
  2. Switch to English.
- expected: every notification text is shown in the chosen language and no raw key is shown.
- verification: playwright
- automated-at: -

---

### TC-OPP-41 Notifications for moderators

- covers: REQ-OPP-14.1
- type: functional
- priority: low
- preconditions: moderator and owner exist
- steps:
  1. As the owner, create an opportunity and submit it.
  2. As the moderator, return it for changes; as the owner, resubmit it.
  3. As the moderator, approve it; as the owner, edit it and then hide it.
  4. As the moderator, open the notifications.
- expected: the moderator has notifications for the new or submitted opportunity, for the resubmission, for the change of the published opportunity and for hiding it.
- verification: playwright
- automated-at: -

---

### TC-OPP-42 The role decides what a user sees

- covers: REQ-OPP-15.2
- type: functional
- priority: high
- preconditions: an ordinary user and a moderator exist
- steps:
  1. Sign in as the ordinary user and open the opportunities page.
  2. Sign in as the moderator and open it.
- expected: the ordinary user has no moderation tab; the moderator has it and also everything the ordinary user has (catalog, my opportunities, my applications, create).
- verification: playwright
- automated-at: -

---

### TC-OPP-43 A removed moderator role stops working at once

- covers: REQ-OPP-03.5, REQ-OPP-15.2
- type: error
- priority: high
- preconditions: a moderator is signed in; an opportunity is in ready for review and another is a draft of someone else
- steps:
  1. Remove the moderator role of that user in the database without signing them out.
  2. As that user, approve the opportunity.
  3. As that user, open the draft and list the moderation queue.
- expected: all three requests are refused and nothing changes; a revoked role does not keep working until the sign-in expires.
- verification: unit
- automated-at: -

---

### TC-OPP-44 Double submit of an application

- covers: REQ-OPP-10.6
- type: edge
- priority: medium
- proposed: yes
- preconditions: a published opportunity exists; applicant is signed in
- steps:
  1. Fill in the application form and double-click send.
- expected: one application is created and one notification is sent.
- verification: playwright
- automated-at: -

---

### TC-OPP-45 The application form is filled in from the profile

- covers: REQ-OPP-10.4
- type: functional
- priority: medium
- preconditions: applicant is signed in; a published opportunity exists; the applicant profile has a name and a corporate email
- steps:
  1. Open the opportunity and choose apply (`opportunities.detailModal.apply`).
- expected: the name and corporate email in the form equal those of the profile.
- verification: playwright
- automated-at: -

---

### TC-OPP-46 Applying to an opportunity that cannot take applications is refused

- covers: REQ-OPP-10.1, REQ-OPP-04.2
- type: error
- priority: medium
- preconditions: opportunities exist: a draft, one hidden by a moderator, one in the paused phase and one in the completed phase; applicant is signed in
- steps:
  1. Send an application (`POST /opportunities/:id/apply`) for each of them.
- expected: all requests are refused and no application is created.
- verification: unit
- automated-at: -

---

### TC-OPP-47 Other people cannot change an owner's data

- covers: REQ-OPP-15.3
- type: error
- priority: high
- preconditions: owner has a draft opportunity and an opportunity with an application; a third user is signed in
- steps:
  1. As the third user, submit the owner's draft for review.
  2. Update the owner's opportunity.
  3. Set the status of the application on the owner's opportunity.
  4. Withdraw the applicant's application.
- expected: all four requests are refused and nothing changes.
- verification: unit
- automated-at: -

---

### TC-OPP-48 The phase changes independently of the status and visibility

- covers: REQ-OPP-09.2, REQ-OPP-09.3
- type: functional
- priority: medium
- preconditions: the owner has a draft and a published opportunity
- steps:
  1. On each, change the phase through start, active, paused, completed, cancelled.
- expected: after each change the phase shows the matching `opportunities.detailModal.phase…` label; the moderation status and the visibility do not change; a new opportunity starts in the start phase.
- verification: playwright
- automated-at: -

---

### TC-OPP-51 Editing a published opportunity sends it back to review

- covers: REQ-OPP-02.5
- type: state
- priority: high
- preconditions: owner has a published opportunity; moderator exists
- steps:
  1. As the owner, edit the description of the opportunity.
  2. As the applicant, open the catalog.
  3. As the moderator, approve it again.
- expected: after step 1 the status is `opportunities.status.readyForReview` and the moderators are notified; in step 2 the opportunity is not in the catalog; after step 3 it is published and in the catalog again.
- verification: playwright
- automated-at: -

---

### TC-OPP-52 The catalog needs a signed-in user

- covers: REQ-OPP-05.5
- type: error
- priority: high
- preconditions: no user is signed in; a published opportunity exists
- steps:
  1. Request the opportunity list (`GET /opportunities`).
  2. Request the details of the published opportunity.
  3. Open the catalog address in the browser.
- expected: the requests are refused and the browser goes to the sign-in page; no opportunity data, no owner email and no contact information is returned.
- verification: unit
- automated-at: -

---

### TC-OPP-53 Only a moderator can lift a moderator's hiding

- covers: REQ-OPP-04.3
- type: error
- priority: medium
- preconditions: a published opportunity is hidden by a moderator
- steps:
  1. As the owner, try to make it visible again.
  2. As a moderator, make it visible again.
- expected: step 1 is refused and the opportunity stays hidden; step 2 shows it in the catalog again.
- verification: unit
- automated-at: -

---

### TC-OPP-54 An owner cannot apply to their own opportunity

- covers: REQ-OPP-10.5
- type: error
- priority: medium
- preconditions: owner has a published opportunity in the active phase
- steps:
  1. As the owner, open the opportunity.
  2. As the owner, send an application (`POST /opportunities/:id/apply`).
- expected: there is no apply button in step 1; step 2 is refused and no application is created.
- verification: unit
- automated-at: -

---

### TC-OPP-55 Only one application per opportunity, also after withdrawing

- covers: REQ-OPP-10.6
- type: error
- priority: medium
- preconditions: applicant has withdrawn their application to a published opportunity in the active phase
- steps:
  1. Send a new application to the same opportunity.
- expected: the request is refused and no second application exists.
- verification: unit
- automated-at: -

---

## Intersections

### TC-OPP-49 Sign in only with a corporate account

- covers: REQ-OPP-15.1
- type: error
- priority: high
- preconditions: a Google account outside the corporate domain and a corporate account exist
- steps:
  1. Sign in with the account outside the corporate domain.
  2. Sign in with the corporate account.
- expected: step 1 is refused and the user cannot create an opportunity or apply; step 2 succeeds.
- verification: playwright
- automated-at: -

---

### TC-OPP-50 The feature toggle switches the platform off

- covers: REQ-OPP-15.4
- type: state
- priority: medium
- preconditions: the portal runs with the platform feature toggle off
- steps:
  1. Open the portal navigation.
  2. Open the opportunities address directly.
- expected: the platform is not in the navigation and its pages cannot be reached; the rest of the portal works.
- verification: playwright
- automated-at: -
