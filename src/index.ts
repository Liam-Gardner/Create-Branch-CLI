import { Command, flags } from "@oclif/command";
import { exec } from "child_process";
import prompts from "prompts";
import * as fs from "fs";
import path from "path";
import { getQuestions } from "./prompt.config";
import { Args, Flags, UnitsOfTime, UserConfig } from "./types";
import {
  addWorklog,
  assignUserToIssue,
  getTicket,
  getTransitions,
  getCurrentUserDetails,
  updateIssueStatusService,
  // getTicketStatus,
} from "./services";
import { parseDate } from "./utils";

class TicketToBranch extends Command {
  // #region fields
  private homedir = require("os").homedir();

  private userConfig = {
    authKey: "",
    branchCheckoutTime: "",
    autoCreateBranch: true,
    companyName: "",
    prefix: "",
    ticketNumber: "",
    username: "",
  };

  private usrStoragePath = path.join(this.homedir, ".ticket-to-branch");

  static description = "Create a git branch from your Jira ticket number";

  static flags = {
    assignUserToTicket: flags.boolean({
      char: "a",
      description: "Assign current user to ticket",
    }),
    reset: flags.boolean({ char: "r", description: "Reset the config" }),
    userConfig: flags.boolean({
      char: "c",
      description: "Show config",
    }),
    updateTicketStatus: flags.string({
      char: "s",
      description:
        "Update ticket with status or 'all' to view available statuses",
      helpValue: "Done",
    }),
    updateTicketTime: flags.string({
      char: "t",
      description:
        "Update time spent on ticket in (m)inutes, (h)ours, or (d)ays",
      helpValue: "4h",
    }),
    version: flags.version({ char: "v" }),
  };

  static args: Args = [
    {
      name: "ticketNumber",
      required: false,
    },
  ];
  //#endregion

  // #region properties
  getUserConfig(): UserConfig {
    return this.userConfig;
  }

  setUserConfig(config: UserConfig) {
    this.userConfig = { ...this.userConfig, ...config };
    fs.writeFileSync(this.usrStoragePath, JSON.stringify(this.userConfig));
  }
  //#endregion

  // #region Methods
  async handleFlags(flags: Flags, args: {}) {
    const {
      assignUserToTicket,
      reset,
      userConfig,
      updateTicketStatus,
      updateTicketTime,
    } = flags;

    const { authKey, companyName, ticketNumber } = this.getUserConfig();

    // TODO: replace me with a switch after tests are written
    if (assignUserToTicket) {
      if (authKey && companyName && ticketNumber) {
        try {
          const { accountId } = await getCurrentUserDetails({
            authKey,
            companyName,
          });
          await assignUserToIssue({
            authKey,
            companyName,
            ticketNumber,
            accountId,
          });
        } catch (error) {
          // TODO: Handle errors better
          this.error(error);
        }
      }
    }
    // TODO: handle blank authkeys (and comapnyName)! ESSENTIAL!!!
    if (updateTicketStatus) {
      const { ticketNumber } = this.getUserConfig();
      // TODO: try/catch blocks
      const ticketUpdate = async () => {
        // TODO: status is stale from this endpoint :(
        // const currentStatus = await getTicketStatus({ ticketNumber });
        // this.log(`Current ticket status is: ${currentStatus}`);

        //TODO: if ticket is not assigned then transitions are limited
        const options = await getTransitions({
          ticketNumber,
        });

        // TODO: filter out current status
        const selectOptions = options?.map((o) => {
          return { title: o.name, value: o.id };
        });

        // TODO: status is stale from endpoint
        // const filteredOptions = selectOptions?.filter(
        //   (o) => o.title !== currentStatus
        // );

        // if we don't find it from the user input...
        if (
          selectOptions &&
          !options?.some((option) => option.name === updateTicketStatus)
        ) {
          // ...give the user the list of possible statuses
          const { transition } = await prompts({
            type: "select",
            name: "transition",
            message: "Pick a status",
            choices: selectOptions, //filteredOptions,
            initial: 1,
          });

          await updateIssueStatusService({
            ticketNumber,
            transition: {
              transition: { id: transition },
            },
          });
        } else {
          this.log(`Updating status to ${updateTicketStatus}...`);

          const transition = options?.find(
            (option) => option.name === updateTicketStatus
          );
          if (transition) {
            await updateIssueStatusService({
              ticketNumber,
              transition: {
                transition: { id: transition.id },
              },
            });
          } else {
            this.error("Error updating ticket status");
          }
        }
      };
      await ticketUpdate();
    }
    if (updateTicketTime) {
      const { ticketNumber } = this.getUserConfig();
      const timeSpentSeconds = this.handleUpdateTicketTime(updateTicketTime);

      await addWorklog({
        ticketNumber,
        worklog: { timeSpentSeconds },
      });
    }
    if (reset) {
      const data = fs.readFileSync(this.usrStoragePath, {
        encoding: "utf8",
        flag: "r",
      });
      this.log(`Current config is ${data}`);
      this.log("Resetting config...");
      this.resetConfig();
      this.log(
        `reset complete, new config is ${JSON.stringify(this.getUserConfig())}`
      );
      this.exit(0);
    }
    if (userConfig) {
      const data = fs.readFileSync(this.usrStoragePath, {
        encoding: "utf8",
        flag: "r",
      });
      this.log(`Current config is ${data}`);
      this.exit(0);
    } else {
      // TODO: Make this a whole lot clearer!
      // We only have one possible arg
      if (!!Object.keys(flags).length && Object.values(args)[0] === undefined) {
        // if we were dealing with flags but no args then just exit
        this.exit(0);
      } else if (!!Object.keys(flags).length && !!Object.keys(args).length) {
        // if we were dealing with flags AND args then return so args can be handled
        return;
      } else {
        this.error("unknown flag", {
          suggestions: ["--help for list of commands"],
        });
      }
    }
  }

  handleUpdateTicketTime(updateTicketTime: string) {
    const toSeconds = (units: number, unitOfTime: UnitsOfTime) => {
      if (unitOfTime === "m") {
        return units * 60;
      }
      if (unitOfTime === "h") {
        return units * 3600;
      }
      if (unitOfTime === "d") {
        return units * 86400;
      } else this.error("Unit of time must be either m, h or d");
    };

    const timeSpent = updateTicketTime.trim();
    const unitOfTime = timeSpent
      .charAt(timeSpent.length - 1)
      .toLowerCase() as UnitsOfTime;

    const units = timeSpent
      .split("")
      .filter((str) => str !== unitOfTime)
      .join("");

    if (!isNaN(Number(units))) {
      return toSeconds(Number(units), unitOfTime);
    } else {
      this.error("Sorry, error setting worklog");
    }
  }

  static sanitiseTicketName(ticketName?: string) {
    return (
      ticketName &&
      ticketName
        .split(" ")
        .filter((str) => str.length !== 0)
        .filter((str) => str !== "-")
        .map((str) =>
          str.replace(/&/g, "and").replace(/%/g, "percent").replace(/[\W]/g, "")
        )
        .join("-")
    );
  }

  private resetConfig(field?: keyof UserConfig) {
    const currentConfig = this.getUserConfig();
    if (field) {
      this.setUserConfig({ ...currentConfig, [field]: "" });
    } else {
      this.setUserConfig({
        authKey: "",
        autoCreateBranch: true,
        branchCheckoutTime: "",
        companyName: "",
        prefix: "",
        ticketNumber: "",
        username: "",
      });
    }
  }

  async captureUserInput(ticketNumber: string) {
    const userConfig = this.getUserConfig();

    try {
      // First time set up
      if (!userConfig.authKey) {
        const { username, companyName, prefix, apiKey } = await prompts(
          getQuestions(userConfig)
        );
        const authKey = Buffer.from(`${username}:${apiKey}`).toString("base64");
        const branchCheckoutTime = parseDate(new Date());
        this.setUserConfig({
          authKey,
          branchCheckoutTime,
          companyName,
          prefix,
          username,
          ticketNumber,
        });
      } else {
        // User has done this before and we just need the new ticket info
        const branchCheckoutTime = parseDate(new Date());
        this.setUserConfig({
          ...this.userConfig,
          branchCheckoutTime,
          ticketNumber,
        });
      }
    } catch (e) {
      this.error("captureUserInput", e);
    }
  }

  loadConfig() {
    if (fs.existsSync(this.usrStoragePath)) {
      const data = fs.readFileSync(this.usrStoragePath, {
        encoding: "utf8",
        flag: "r",
      });
      try {
        const parsedData: UserConfig = JSON.parse(data);
        this.setUserConfig(parsedData);
      } catch (e) {
        this.error("error getting user config", {
          exit: 0,
          suggestions: ['Try "createBranch --reset" to reset your config'],
        });
      }
    } else {
      fs.writeFileSync(this.usrStoragePath, JSON.stringify(this.userConfig));
    }
  }
  //#endregion

  // #region main
  async run() {
    const { args, flags } = this.parse(TicketToBranch);
    const checkoutBranch = async () => {
      const {
        authKey,
        autoCreateBranch,
        companyName,
        prefix,
        ticketNumber,
      } = this.getUserConfig();

      try {
        const ticketName = await getTicket({
          authKey,
          companyName,
          ticketNumber,
        });

        const sanitisedTicketName = TicketToBranch.sanitiseTicketName(
          ticketName
        );

        autoCreateBranch &&
          sanitisedTicketName &&
          exec(
            prefix
              ? `git checkout -b ${prefix}/${args.ticketNumber}-${sanitisedTicketName}`
              : `git checkout -b ${args.ticketNumber}-${sanitisedTicketName}`,
            (error) => {
              if (error) {
                this.log(
                  `Sorry, we can\'t generate a valid git branch from this ticket name - '${ticketName}' \n${error}`
                );
              }
            }
          );
      } catch (err) {
        this.resetConfig("authKey"); //TODO: hmmm
        this.error("Jira API request error", err.message);
      }
    };

    this.loadConfig();
    if (Object.keys(args).length && args.ticketNumber) {
      await this.captureUserInput(args.ticketNumber);
    }
    if (Object.keys(flags).length) {
      await this.handleFlags(flags, args);
    }
    // The above will exit the process if any errors otherwise if all good we can try to checkout the branch
    // Or in the case of no command args the handleFlags will do what it has to do and then exit before this line
    checkoutBranch();
  }
  //#endregion
}

export = TicketToBranch;
