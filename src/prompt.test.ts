import TicketToBranch from "./index";

const testValues = [
  { ticketName: "Make new feature", branchName: "Make-new-feature" },
];

describe("sanitiseTicketName", () => {
  test.each(testValues)(
    "creates a valid git branch",
    ({ ticketName, branchName }) => {
      expect(TicketToBranch.sanitiseTicketName(ticketName)).toBe(branchName);
    }
  );
});
