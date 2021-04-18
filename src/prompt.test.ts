import TicketToBranch from "./index";

const testValues = [
  {
    ticketName: "Inconsistent behaviour of the new feature page",
    branchName: "Inconsistent-behaviour-of-the-new-feature-page",
  },
  {
    ticketName: "No cell borders on leftmost cell in tables",
    branchName: "No-cell-borders-on-leftmost-cell-in-tables",
  },
  {
    ticketName: "FE - Hide CSV Export button for non-admin/mgd admin roles",
    branchName: "FE-Hide-CSV-Export-button-for-nonadminmgd-admin-roles",
  },
  {
    ticketName: "investigate 12345gg `ServerError Sorry. An error occurred...`",
    branchName: "investigate-12345gg-ServerError-Sorry-An-error-occurred",
  },
  {
    ticketName: "The lines on the X axis appear to be clipped at the end. ",
    branchName: "The-lines-on-the-X-axis-appear-to-be-clipped-at-the-end",
  },
  {
    ticketName:
      "Ensure we pass details as part of /whatever/ endpoint instead of something else",
    branchName:
      "Ensure-we-pass-details-as-part-of-whatever-endpoint-instead-of-something-else",
  },
  {
    ticketName: "[BE] Test the controller",
    branchName: "BE-Test-the-controller",
  },
  {
    ticketName: "Implement 'keep-alive' method for new devices",
    branchName: "Implement-keepalive-method-for-new-devices",
  },
  {
    ticketName: "M2 - Feature - Connect new feature API to FE",
    branchName: "M2-Feature-Connect-new-feature-API-to-FE",
  },
  {
    ticketName: "SomeTests   RF-->ABCD",
    branchName: "SomeTests-RFABCD",
  },
  {
    ticketName:
      "5% failure rate on Feature (5 issues) - task to reduce % of failures",
    branchName:
      "5percent-failure-rate-on-Feature-5-issues-task-to-reduce-percent-of-failures",
  },
  {
    ticketName:
      "product TypeError undefined is not an object (evaluating 't.something.anotherThing.importantThing')",
    branchName:
      "product-TypeError-undefined-is-not-an-object-evaluating-tsomethinganotherThingimportantThing",
  },
];

describe("sanitiseTicketName", () => {
  test.each(testValues)(
    "creates a valid git branch",
    ({ ticketName, branchName }) => {
      expect(TicketToBranch.sanitiseTicketName(ticketName)).toBe(branchName);
    }
  );
});
