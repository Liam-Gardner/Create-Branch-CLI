type UserConfig = {
  authKey: string;
  autoCreateBranch?: boolean;
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
  help: boolean;
  userConfig: boolean;
  reset: boolean;
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

type UnitsOfTime = "m" | "h" | "d";

export { Args, Flags, UnitsOfTime, UserConfig, Worklog };
