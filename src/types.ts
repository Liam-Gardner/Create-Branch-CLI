type UserConfig = {
  authKey: string;
  autoCreateBranch?: boolean;
  branchCheckoutTime: string;
  companyName: string;
  prefix: string;
  ticketNumber: string;
  username: string;
};

type Args = [
  {
    name: "ticketNumber";
    required: boolean;
  }
];

type Flags = {
  assignUserToTicket: boolean;
  userConfig: boolean;
  reset: boolean;
  updateTicketStatus: string | undefined;
  updateTicketTime: string | undefined;
  version: void;
};

type Worklog = {
  comment?: string;
  visibility?: {
    type: string;
    value: string;
  };
  started?: string; //"2017-12-07T09:23:19.552+0000";
  timeSpentSeconds: number;
};

type Status = {
  transition: { id: string };
};

type UnitsOfTime = "m" | "h" | "d";

export { Args, Flags, UnitsOfTime, UserConfig, Status, Worklog };
