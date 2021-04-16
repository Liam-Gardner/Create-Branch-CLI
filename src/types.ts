type UserConfig = {
  authKey: string;
  autoCreateBranch?: boolean;
  companyName: string;
  prefix: string;
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
  getJiraIssues: boolean;
  userConfig: boolean;
  reset: boolean;
  version: void;
};

export { Args, Flags, UserConfig };
