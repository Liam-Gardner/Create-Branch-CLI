type UserConfig = {
  authKey: string;
  companyName: string;
  prefix: string;
  autoCreateBranch?: boolean;
};

type Args = [
  {
    name: "ticketNumber";
    required: boolean;
    parse: (input: string) => string;
  }
];

export { Args, UserConfig };
