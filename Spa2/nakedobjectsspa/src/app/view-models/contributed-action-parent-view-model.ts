﻿import { MessageViewModel } from './message-view-model';
import * as Models from '../models';
import * as Msg from '../user-messages';
import { ViewModelFactoryService } from '../view-model-factory.service';
import { UrlManagerService } from '../url-manager.service';
import { ErrorService } from '../error.service';
import { ContextService } from '../context.service';
import { ItemViewModel } from './item-view-model';
import { ActionViewModel } from './action-view-model';
import { ParameterViewModel } from './parameter-view-model';
import * as _ from 'lodash';
import * as Helpers from './helpers-view-models';
import { MenuItemViewModel } from './menu-item-view-model';
import { PaneRouteData } from '../route-data';

export abstract class ContributedActionParentViewModel extends MessageViewModel {

    protected constructor(
        protected readonly context: ContextService,
        protected readonly viewModelFactory: ViewModelFactoryService,
        protected readonly urlManager: UrlManagerService,
        protected readonly error: ErrorService,
        public readonly onPaneId: number
    ) {
        super();
    }

    readonly allSelected = () => _.every(this.items, item => item.selected);
    items: ItemViewModel[];
    actions: ActionViewModel[];
    menuItems: MenuItemViewModel[];

    private isLocallyContributed(action: Models.IInvokableAction) {
        return _.some(action.parameters(), p => p.isCollectionContributed());
    }

    setActions(actions: _.Dictionary<Models.ActionMember>, routeData: PaneRouteData) {
        this.actions = _.map(actions, action => this.viewModelFactory.actionViewModel(action, this, routeData));
        this.menuItems = Helpers.createMenuItems(this.actions);
        _.forEach(this.actions, a => this.decorate(a));
    }

    protected collectionContributedActionDecorator(actionViewModel: ActionViewModel) {
        const wrappedInvoke = actionViewModel.execute;
        actionViewModel.execute = (pps: ParameterViewModel[], right?: boolean) => {

            const selected = _.filter(this.items, i => i.selected);

            const rejectAsNeedSelection = (action: Models.IInvokableAction): Models.ErrorWrapper | null => {
                if (this.isLocallyContributed(action)) {
                    if (selected.length === 0) {
                        const em = new Models.ErrorMap({}, 0, Msg.noItemsSelected);
                        const rp = new Models.ErrorWrapper(Models.ErrorCategory.HttpClientError, Models.HttpStatusCode.UnprocessableEntity, em);
                        return rp;
                    }
                }
                return null;
            }

            const getParms = (action: Models.IInvokableAction) => {

                const parms = _.values(action.parameters()) as Models.Parameter[];
                const contribParm = _.find(parms, p => p.isCollectionContributed());

                if (contribParm) {
                    const parmValue = new Models.Value(_.map(selected, i => i.link));
                    const collectionParmVm = this.viewModelFactory.parameterViewModel(contribParm, parmValue, this.onPaneId);

                    const allpps = _.clone(pps);
                    allpps.push(collectionParmVm);
                    return allpps;
                }
                return pps;
            }

            const detailsPromise = actionViewModel.invokableActionRep
                ? Promise.resolve(actionViewModel.invokableActionRep)
                : this.context.getActionDetails(actionViewModel.actionRep as Models.ActionMember);

            return detailsPromise.
                then((details: Models.IInvokableAction) => {
                    const rp = rejectAsNeedSelection(details);
                    return rp ? Promise.reject(rp) : wrappedInvoke(getParms(details), right);
                }).
                then(result => {
                    // clear selected items on void actions 
                    this.clearSelected(result);
                    return result;
                });
        }
    }

    protected collectionContributedInvokeDecorator(actionViewModel: ActionViewModel) {

        const showDialog = () =>
            this.context.getInvokableAction(actionViewModel.actionRep as Models.ActionMember).
                then(invokableAction => {
                    actionViewModel.makeInvokable(invokableAction);
                    const keyCount = _.keys(invokableAction.parameters()).length;
                    return keyCount > 1 || keyCount === 1 && !_.toArray(invokableAction.parameters())[0].isCollectionContributed();
                });

        // make sure not invokable  while waiting for promise to assign correct function 
        actionViewModel.doInvoke = () => { };

        const invokeWithoutDialog = (right?: boolean) =>
            actionViewModel.invokeWithoutDialogWithParameters(Promise.resolve([]), right).then((actionResult: Models.ActionResultRepresentation) => {
                this.setMessage(actionResult.shouldExpectResult() ? actionResult.warningsOrMessages() || Msg.noResultMessage : "");
                // clear selected items on void actions 
                this.clearSelected(actionResult);
            });

        showDialog().
            then(show => actionViewModel.doInvoke = show ? actionViewModel.invokeWithDialog : invokeWithoutDialog).
            catch((reject: Models.ErrorWrapper) => this.error.handleError(reject));
    }

    protected decorate(actionViewModel: ActionViewModel) {
        this.collectionContributedActionDecorator(actionViewModel);
        this.collectionContributedInvokeDecorator(actionViewModel);
    }

    private setItems(newValue: boolean) {
        _.each(this.items, item => item.silentSelect(newValue));
        const id = _.first(this.items).id;
        this.urlManager.setAllItemsSelected(newValue, id, this.onPaneId);
    }

    protected clearSelected(result: Models.ActionResultRepresentation) {
        if (result.resultType() === "void") {
            this.setItems(false);
        }
    }

    readonly selectAll = () => {
        const newState = !this.allSelected();
        this.setItems(newState);
    };

}