/// <reference path="typings/angularjs/angular.d.ts" />
/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="nakedobjects.models.ts" />

module NakedObjects.Angular.Gemini {

    // todo improve error handling

    export interface IHandlers {
        handleBackground($scope: INakedObjectsScope): void;
        handleError($scope: INakedObjectsScope): void;
        handleToolBar($scope: INakedObjectsScope): void;
        handleObject($scope: INakedObjectsScope, routeData: PaneRouteData): void;
        handleHome($scope: INakedObjectsScope, routeData: PaneRouteData): void;
        handleList($scope: INakedObjectsScope, routeData: PaneRouteData): void;
    }

    app.service("handlers", function ($routeParams: ng.route.IRouteParamsService, $location: ng.ILocationService, $q: ng.IQService, $cacheFactory: ng.ICacheFactoryService, repLoader: IRepLoader, context: IContext, viewModelFactory: IViewModelFactory, color: IColor, navigation: INavigation, urlManager: IUrlManager, focusManager: IFocusManager, $timeout: ng.ITimeoutService) {
        const handlers = <IHandlers>this;

        const perPaneListViews = [, new ListViewModel(color, context, viewModelFactory, urlManager, focusManager, $q),
            new ListViewModel(color, context, viewModelFactory, urlManager, focusManager, $q)];

        const perPaneObjectViews = [, new DomainObjectViewModel(color, context, viewModelFactory, urlManager, focusManager),
            new DomainObjectViewModel(color, context, viewModelFactory, urlManager, focusManager)];

        const perPaneDialogViews = [, new DialogViewModel(color, context, viewModelFactory, urlManager, focusManager),
                                      new DialogViewModel(color, context, viewModelFactory, urlManager, focusManager)];

        const perPaneMenusViews = [, new MenusViewModel(viewModelFactory),
                                    new MenusViewModel(viewModelFactory)];

        function setVersionError(error) {
            const errorRep = ErrorRepresentation.create(error);
            context.setError(errorRep);
            urlManager.setError();
        }

        function setError(error: ErrorRepresentation);
        function setError(error: ErrorMap);
        function setError(error: any) {
            if (error instanceof ErrorRepresentation) {
                context.setError(error);
            } else if (error instanceof ErrorMap) {
                const em = <ErrorMap>error;
                const errorRep = ErrorRepresentation.create(`unexpected error map: ${em.warningMessage}`);
                context.setError(errorRep);
            } else {
                error = error || "unknown";
                const errorRep = ErrorRepresentation.create(`unexpected error: ${error.toString()}`);
                context.setError(errorRep);
            }

            urlManager.setError();
        }

        function cacheRecentlyViewed(object: DomainObjectRepresentation) {
            const cache = $cacheFactory.get("recentlyViewed");

            if (cache && object && !object.persistLink()) {
                const key = object.domainType();
                const subKey = object.selfLink().href();
                const dict = cache.get(key) || {};
                dict[subKey] = { value: new Value(object.selfLink()), name: object.title() };
                cache.put(key, dict);
            }
        }

        // todo just make array of functions ?
        class DeReg {
            deRegLocation: () => void = () => { };
            deRegSearch: () => void = () => { };
            deRegSwap: () => void = () => { };
            deReg() {
                this.deRegLocation();
                this.deRegSearch();
            }
        }

        const deRegDialog = [, new DeReg(), new DeReg()];
        const deRegObject = [, new DeReg(), new DeReg()];

        function setDialog($scope: INakedObjectsScope, action: ActionMember | ActionViewModel, routeData: PaneRouteData) {
            deRegDialog[routeData.paneId].deReg();

            $scope.dialogTemplate = dialogTemplate;
            const actionViewModel = action instanceof ActionMember ? viewModelFactory.actionViewModel(action, routeData) : action as ActionViewModel;
            const dialogViewModel = perPaneDialogViews[routeData.paneId];
            dialogViewModel.reset(actionViewModel, routeData);
            $scope.dialog = dialogViewModel; 

            deRegDialog[routeData.paneId].deRegLocation = $scope.$on("$locationChangeStart", dialogViewModel.setParms) as () => void;
            deRegDialog[routeData.paneId].deRegSearch = $scope.$watch(() => $location.search(), dialogViewModel.setParms, true) as () => void;
        }

        handlers.handleBackground = ($scope: INakedObjectsScope) => {
            $scope.backgroundColor = color.toColorFromHref($location.absUrl());

            navigation.push();

            // validate version 

            // todo just do once - cached but still pointless repeating each page refresh
            context.getVersion().then((v: VersionRepresentation) => {
                const specVersion = parseFloat(v.specVersion());
                const domainModel = v.optionalCapabilities().domainModel;

                if (specVersion < 1.1) {
                    setVersionError("Restful Objects server must support spec version 1.1 or greater for NakedObjects Gemini\r\n (8.2:specVersion)");
                }

                if (domainModel !== "simple" && domainModel !== "selectable") {
                    setVersionError(`NakedObjects Gemini requires domain metadata representation to be simple or selectable not "${domainModel}"\r\n (8.2:optionalCapabilities)`);
                }
            });
        };

        handlers.handleHome = ($scope: INakedObjectsScope, routeData: PaneRouteData) => {

            context.getMenus().
                then((menus: MenusRepresentation) => {
                    $scope.menus = perPaneMenusViews[routeData.paneId].reset(menus, routeData);
                    $scope.homeTemplate = homeTemplate;

                    if (routeData.menuId) {
                        context.getMenu(routeData.menuId).
                            then((menu: MenuRepresentation) => {
                                $scope.actionsTemplate = actionsTemplate;
                                const actions = { actions: _.map(menu.actionMembers(), am => viewModelFactory.actionViewModel( am, routeData)) };
                                $scope.object = actions;

                                const focusTarget = routeData.dialogId ? FocusTarget.Dialog : FocusTarget.SubAction;

                                if (routeData.dialogId) {                               
                                    const action = menu.actionMember(routeData.dialogId);
                                    setDialog($scope, action, routeData);
                                }

                                focusManager.focusOn(focusTarget, 0, routeData.paneId);
                            }).catch(error => {
                                setError(error);
                            });
                    } else {
                        focusManager.focusOn(FocusTarget.Menu, 0, routeData.paneId);
                    }
                }).catch(error => {
                    setError(error);
                });
        };       

        handlers.handleList = ($scope: INakedObjectsScope, routeData: PaneRouteData) => {

            const cachedList = context.getCachedList(routeData.paneId, routeData.page, routeData.pageSize);

            const getActionExtensions = routeData.objectId ?
                () => context.getActionExtensionsFromObject(routeData.paneId, routeData.objectId, routeData.actionId) :
                () => context.getActionExtensionsFromMenu(routeData.menuId, routeData.actionId);
            

            if (cachedList) {
                $scope.listTemplate = routeData.state === CollectionViewState.List ? listTemplate : listAsTableTemplate;
                const collectionViewModel = perPaneListViews[routeData.paneId];
                collectionViewModel.reset(cachedList, routeData);
                $scope.collection = collectionViewModel;
                $scope.actionsTemplate = routeData.actionsOpen ? actionsTemplate : nullTemplate;
                let focusTarget = routeData.actionsOpen ? FocusTarget.SubAction : FocusTarget.ListItem;

                if (routeData.dialogId) {
                    const actionViewModel = _.find(collectionViewModel.actions, a => a.actionRep.actionId() === routeData.dialogId);
                    setDialog($scope, actionViewModel, routeData);
                    focusTarget = FocusTarget.Dialog;
                }

                focusManager.focusOn(focusTarget, 0, routeData.paneId);
                getActionExtensions().then((ext: Extensions) => $scope.title = ext.friendlyName());
            } else {
                $scope.listTemplate = listPlaceholderTemplate;
                $scope.collectionPlaceholder = viewModelFactory.listPlaceholderViewModel(routeData);
                getActionExtensions().then((ext: Extensions) => $scope.title = ext.friendlyName());
                focusManager.focusOn(FocusTarget.Action, 0, routeData.paneId);       
            }
        };

        handlers.handleError = ($scope: INakedObjectsScope) => {
            const  error = context.getError();
            if (error) {
                const evm = viewModelFactory.errorViewModel(error);
                $scope.error = evm;
                $scope.errorTemplate = errorTemplate;
            }
        };

        handlers.handleToolBar = ($scope: INakedObjectsScope) => {
            $scope.toolBar = viewModelFactory.toolBarViewModel();
        };     

        handlers.handleObject = ($scope: INakedObjectsScope, routeData: PaneRouteData) => {

            const [dt, ...id] = routeData.objectId.split("-");

            // to ease transition 
            $scope.objectTemplate = blankTemplate;
            $scope.actionsTemplate = nullTemplate;
            $scope.object = { color: color.toColorFromType(dt) }; 

            deRegObject[routeData.paneId].deReg();

            context.getObject(routeData.paneId, dt, id, routeData.interactionMode === InteractionMode.Transient).
                then((object: DomainObjectRepresentation) => {
                    

                    const ovm = perPaneObjectViews[routeData.paneId].reset(object, routeData);

                    $scope.object = ovm;

                    if (ovm.isInEdit) {
                        $scope.objectTemplate = objectEditTemplate;
                        $scope.actionsTemplate = nullTemplate;
                    } else {
                        $scope.objectTemplate = objectViewTemplate;
                        $scope.actionsTemplate = routeData.actionsOpen ? actionsTemplate : nullTemplate;
                    }

                    $scope.collectionsTemplate = collectionsTemplate;

                    // cache
                    cacheRecentlyViewed(object);

                    let focusTarget: FocusTarget;

                    if (routeData.dialogId) {                    
                        const action = object.actionMember(routeData.dialogId);
                        setDialog($scope, action, routeData);
                        focusTarget = FocusTarget.Dialog;
                    } else if (routeData.actionsOpen) {
                        focusTarget = FocusTarget.SubAction;
                    } else if (ovm.isInEdit) {
                        focusTarget = FocusTarget.Property;
                    } else {
                        focusTarget = FocusTarget.ObjectTitle;
                    }

                    focusManager.focusOn(focusTarget, 0, routeData.paneId);

                    deRegObject[routeData.paneId].deRegLocation = $scope.$on("$locationChangeStart", ovm.setProperties) as () => void;
                    deRegObject[routeData.paneId].deRegSearch = $scope.$watch(() => $location.search(), ovm.setProperties, true) as () => void;
                    deRegObject[routeData.paneId].deRegSwap = $scope.$on("pane-swap", ovm.setProperties) as () => void;

                }).catch(error => {
                    // todo create a proper error wrapper for this 
                    if (error === "expired transient") {
                        $scope.objectTemplate = expiredTransientTemplate;
                    } else {
                        setError(error);
                    }
                });

        };
    });
}