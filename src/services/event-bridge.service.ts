import {
    EventBridgeClient,
    PutRuleCommand,
    PutTargetsCommand,
    DeleteRuleCommand,
    RemoveTargetsCommand,
    RuleState,
    ResourceNotFoundException,
    PutRuleCommandInput,
} from '@aws-sdk/client-eventbridge';
import { EventBridgeConfig } from '../dto/data/event-bridge-config';

export class EventBridgeService {

    private client: EventBridgeClient;

    constructor(private readonly config: EventBridgeConfig | null) {
        this.client = new EventBridgeClient(config || {});
    }

    async scheduleEvent(
        rule_name: string,
        schedule_date: Date,
        target_arn: string,
        data: Record<string, unknown>,
    ) {
        const ruleParams: PutRuleCommandInput = {
            Name: rule_name,
            ScheduleExpression: `cron(${schedule_date.getUTCMinutes()} ${schedule_date.getUTCHours()} ${schedule_date.getUTCDate()} ${schedule_date.getUTCMonth() + 1} ? ${schedule_date.getUTCFullYear()})`,
            State: RuleState.ENABLED,
        };

        const ruleCommand = new PutRuleCommand(ruleParams);
        await this.client.send(ruleCommand);

        const targetParams = {
            Rule: rule_name,
            Targets: [
                {
                    Arn: target_arn,
                    Id: rule_name,
                    Input: JSON.stringify(data),
                },
            ],
        };

        const targetCommand = new PutTargetsCommand(targetParams);
        await this.client.send(targetCommand);
    }

    async cancelEvent(rule: string) {
        const removeTargetsParams = {
            Rule: rule,
            Ids: [rule],
        };

        const removeTargetsCommand = new RemoveTargetsCommand(removeTargetsParams);
        try {
            await this.client.send(removeTargetsCommand);
        } catch (ex) {
            if (ex instanceof ResourceNotFoundException) {
                //Do nothing
            } else {
                throw ex;
            }
        }

        const deleteRuleParams = {
            Name: rule,
        };

        const deleteRuleCommand = new DeleteRuleCommand(deleteRuleParams);

        try {
            await this.client.send(deleteRuleCommand);
        } catch (ex) {
            if (ex instanceof ResourceNotFoundException) {
                //Do nothing
            } else {
                throw ex;
            }
        }
    }
}
