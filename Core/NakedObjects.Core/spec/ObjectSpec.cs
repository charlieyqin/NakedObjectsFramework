// Copyright Naked Objects Group Ltd, 45 Station Road, Henley on Thames, UK, RG9 1AT
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and limitations under the License.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Common.Logging;
using NakedObjects.Architecture;
using NakedObjects.Architecture.Adapter;
using NakedObjects.Architecture.Component;
using NakedObjects.Architecture.Facet;
using NakedObjects.Architecture.Interactions;
using NakedObjects.Architecture.Menu;
using NakedObjects.Architecture.Reflect;
using NakedObjects.Architecture.Spec;
using NakedObjects.Architecture.SpecImmutable;
using NakedObjects.Core.Util;

namespace NakedObjects.Core.Spec {
    public class ObjectSpec : IObjectSpec {
        private static readonly ILog Log = LogManager.GetLogger(typeof(ObjectSpec));
        private readonly IObjectSpecImmutable innerSpec;
        private readonly SpecFactory memberFactory;
        private readonly IMetamodelManager metamodelManager;

        // cached values 
        private IActionSpec[] combinedActions;
        private IActionSpec[] contributedActions;
        private IActionSpec[] collectionContributedActions;
        private IActionSpec[] finderActions;
        private string description;
        private bool? hasNoIdentity;
        private bool? hasSubclasses;
        private IObjectSpec[] interfaces;
        private bool? isASet;
        private bool? isAbstract;
        private bool? isAggregated;
        private bool? isCollection;
        private bool? isEncodeable;
        private bool? isInterface;
        private bool? isParseable;
        private bool? isQueryable;
        private bool? isViewModel;
        private bool? isVoid;
        private IActionSpec[] objectActions;
        private IAssociationSpec[] objectFields;
        private PersistableType? persistable;
        private string pluralName;
        private string shortName;
        private string singularName;
        private IObjectSpec[] subclasses;
        private IObjectSpec superclass;
        private string untitledName;

        public ObjectSpec(SpecFactory memberFactory, IMetamodelManager metamodelManager, IObjectSpecImmutable innerSpec) {
            Assert.AssertNotNull(memberFactory);
            Assert.AssertNotNull(metamodelManager);
            Assert.AssertNotNull(innerSpec);

            this.memberFactory = memberFactory;
            this.metamodelManager = metamodelManager;
            this.innerSpec = innerSpec;
        }

        private Type Type {
            get { return innerSpec.Type; }
        }

        private IActionSpec[] ObjectActions {
            get {
                if (objectActions == null) {
                    objectActions = memberFactory.OrderActions(innerSpec.ObjectActions);
                }
                return objectActions;
            }
        }

        private IActionSpec[] ContributedActions {
            get {
                if (contributedActions == null) {
                    contributedActions = memberFactory.OrderActions(innerSpec.ContributedActions);
                }
                return contributedActions;
            }
        }

        #region IObjectSpec Members

        public virtual string FullName {
            get { return innerSpec.FullName; }
        }

        public virtual object DefaultValue {
            get { return null; }
        }

        public Type[] FacetTypes {
            get { return innerSpec.FacetTypes; }
        }

        public IIdentifier Identifier {
            get { return innerSpec.Identifier; }
        }

        public bool ContainsFacet(Type facetType) {
            return innerSpec.ContainsFacet(facetType);
        }

        public bool ContainsFacet<T>() where T : IFacet {
            return innerSpec.ContainsFacet<T>();
        }

        public IFacet GetFacet(Type type) {
            return innerSpec.GetFacet(type);
        }

        public T GetFacet<T>() where T : IFacet {
            return innerSpec.GetFacet<T>();
        }

        public IEnumerable<IFacet> GetFacets() {
            return innerSpec.GetFacets();
        }


        public virtual bool IsParseable {
            get {
                if (!isParseable.HasValue) {
                    isParseable = innerSpec.ContainsFacet(typeof(IParseableFacet));
                }
                return isParseable.Value;
            }
        }

        public virtual bool IsEncodeable {
            get {
                if (!isEncodeable.HasValue) {
                    isEncodeable = innerSpec.ContainsFacet(typeof(IEncodeableFacet));
                }
                return isEncodeable.Value;
            }
        }

        public virtual bool IsAggregated {
            get {
                if (!isAggregated.HasValue) {
                    isAggregated = innerSpec.ContainsFacet(typeof(IAggregatedFacet));
                }
                return isAggregated.Value;
            }
        }

        public virtual bool IsCollection {
            get {
                if (!isCollection.HasValue) {
                    isCollection = innerSpec.ContainsFacet(typeof(ICollectionFacet));
                }
                return isCollection.Value;
            }
        }

        public virtual bool IsViewModel {
            get {
                if (!isViewModel.HasValue) {
                    isViewModel = innerSpec.ContainsFacet(typeof(IViewModelFacet));
                }
                return isViewModel.Value;
            }
        }

        public virtual bool IsObject {
            get { return !IsCollection; }
        }

        public virtual IObjectSpec Superclass {
            get {
                if (superclass == null && innerSpec.Superclass != null) {
                    superclass = metamodelManager.GetSpecification(innerSpec.Superclass);
                }
                return superclass;
            }
        }

        public virtual IAssociationSpec[] Properties {
            get {
                if (objectFields == null) {
                    objectFields = innerSpec.Fields.Select(element => memberFactory.CreateAssociationSpec(element)).ToArray();
                }
                return objectFields;
            }
        }

        public virtual IActionSpec[] GetObjectActions() {
            if (combinedActions == null) {
                var ca = new List<IActionSpec>();
                ca.AddRange(ObjectActions);
                ca.AddRange(ContributedActions);
                combinedActions = ca.ToArray();
            }
            return combinedActions;
        }

        public IActionSpec[] GetCollectionContributedActions() {
            if (collectionContributedActions == null) {
                collectionContributedActions = memberFactory.OrderActions(innerSpec.CollectionContributedActions);
            }
            return collectionContributedActions;
        }

        public IActionSpec[] GetFinderActions() {
                if (finderActions == null) {
                    finderActions = memberFactory.OrderActions(innerSpec.FinderActions);
                }
                return finderActions;
        }

        public IMenuImmutable ObjectMenu {
            get { return innerSpec.ObjectMenu; }
        }

        public bool IsASet {
            get {
                if (!isASet.HasValue) {
                    var collectionFacet = innerSpec.GetFacet<ICollectionFacet>();
                    isASet = collectionFacet != null && collectionFacet.IsASet;
                }

                return isASet.Value;
            }
        }

        public bool HasSubclasses {
            get {
                if (!hasSubclasses.HasValue) {
                    hasSubclasses = innerSpec.Subclasses.Any();
                }
                return hasSubclasses.Value;
            }
        }

        public IObjectSpec[] Interfaces {
            get {
                if (interfaces == null) {
                    interfaces = innerSpec.Interfaces.Select(i => metamodelManager.GetSpecification(i)).ToArray();
                }
                return interfaces;
            }
        }

        public IObjectSpec[] Subclasses {
            get {
                if (subclasses == null) {
                    subclasses = innerSpec.Subclasses.Select(i => metamodelManager.GetSpecification(i)).ToArray();
                }
                return subclasses;
            }
        }

        public bool IsAbstract {
            get {
                if (!isAbstract.HasValue) {
                    isAbstract = innerSpec.ContainsFacet(typeof(IAbstractFacet));
                }
                return isAbstract.Value;
            }
        }

        public bool IsInterface {
            get {
                if (!isInterface.HasValue) {
                    isInterface = innerSpec.ContainsFacet(typeof(IInterfaceFacet));
                }
                return isInterface.Value;
            }
        }

        public bool IsService {
            get { return innerSpec.Service; }
        }

        public string ShortName {
            get {
                if (shortName == null) {
                    string postfix = "";
                    if (Type.IsGenericType && !IsCollection) {
                        postfix = Type.GetGenericArguments().Aggregate(string.Empty, (x, y) => x + "-" + metamodelManager.GetSpecification(y).ShortName);
                    }

                    shortName = innerSpec.ShortName + postfix;
                }

                return shortName;
            }
        }

        public string SingularName {
            get {
                if (singularName == null) {
                    singularName = innerSpec.GetFacet<INamedFacet>().Value;
                }
                return singularName;
            }
        }

        public string UntitledName {
            get {
                if (untitledName == null) {
                    untitledName = Resources.NakedObjects.Untitled + SingularName;
                }
                return untitledName;
            }
        }

        public string PluralName {
            get {
                if (pluralName == null) {
                    pluralName = innerSpec.GetFacet<IPluralFacet>().Value;
                }
                return pluralName;
            }
        }

        public string Description {
            get {
                if (description == null) {
                    description = innerSpec.GetFacet<IDescribedAsFacet>().Value ?? "";
                }
                return description;
            }
        }

        public bool HasNoIdentity {
            get {
                if (!hasNoIdentity.HasValue) {
                    hasNoIdentity = innerSpec.GetFacet<ICollectionFacet>() != null || innerSpec.GetFacet<IParseableFacet>() != null;
                }
                return hasNoIdentity.Value;
            }
        }

        public bool IsQueryable {
            get {
                if (!isQueryable.HasValue) {
                    var collectionFacet = innerSpec.GetFacet<ICollectionFacet>();
                    isQueryable = collectionFacet != null && collectionFacet.IsQueryable;
                }
                return isQueryable.Value;
            }
        }

        public bool IsVoid {
            get {
                if (!isVoid.HasValue) {
                    isVoid = innerSpec.ContainsFacet(typeof(IVoidFacet));
                }
                return isVoid.Value;
            }
        }

        public PersistableType Persistable {
            get {
                if (!persistable.HasValue) {
                    persistable = GetPersistable();
                }
                return persistable.Value;
            }
        }

        /// <summary>
        ///     Determines if this class represents the same class, or a subclass, of the specified class.
        /// </summary>
        public bool IsOfType(IObjectSpec spec) {
            if (spec.Equals(this)) {
                return true;
            }
            if (Interfaces.Any(interfaceSpec => interfaceSpec.IsOfType(spec))) {
                return true;
            }

            // match covariant generic types 
            if (Type.IsGenericType && IsCollection) {
                Type otherType = ((ObjectSpec)spec).Type;
                if (otherType.IsGenericType && Type.GetGenericArguments().Count() == 1 && otherType.GetGenericArguments().Count() == 1) {
                    if (Type.GetGenericTypeDefinition() == (typeof(IQueryable<>)) && Type.GetGenericTypeDefinition() == otherType.GetGenericTypeDefinition()) {
                        Type genericArgument = Type.GetGenericArguments().Single();
                        Type otherGenericArgument = otherType.GetGenericArguments().Single();
                        Type otherGenericParameter = otherType.GetGenericTypeDefinition().GetGenericArguments().Single();
                        if ((otherGenericParameter.GenericParameterAttributes & GenericParameterAttributes.Covariant) != 0) {
                            if (otherGenericArgument.IsAssignableFrom(genericArgument)) {
                                return true;
                            }
                        }
                    }
                }
            }

            return Superclass != null && Superclass.IsOfType(spec);
        }


        public IAssociationSpec GetProperty(string id) {
            try {
                return Properties.First(f => f.Id.Equals(id));
            } catch (InvalidOperationException) {
                throw new ReflectionException(string.Format("No field called '{0}' in '{1}'", id, SingularName));
            }
        }

        public string GetTitle(INakedObject nakedObject) {
            return innerSpec.GetTitle(nakedObject);
        }

        public string GetInvariantString(INakedObject nakedObject) {
            var parser = GetFacet<IParseableFacet>();
            return parser == null ? null : parser.InvariantString(nakedObject);
        }

        public string GetIconName(INakedObject forObject) {
            return innerSpec.GetIconName(forObject, metamodelManager.Metamodel);
        }

        public IConsent ValidToPersist(INakedObject target, ISession session) {
            InteractionContext ic = InteractionContext.PersistingObject(session, false, target);
            IConsent cons = InteractionUtils.IsValid(target.Spec, ic);
            return cons;
        }

        #endregion

        private PersistableType GetPersistable() {
            if (IsService) {
                return PersistableType.ProgramPersistable;
            }
            if (innerSpec.ContainsFacet<INotPersistedFacet>()) {
                return PersistableType.Transient;
            }
            if (innerSpec.ContainsFacet<IProgramPersistableOnlyFacet>()) {
                return PersistableType.ProgramPersistable;
            }
            return PersistableType.UserPersistable;
        }

        private string TypeNameFor() {
            return IsCollection ? "Collection" : "Object";
        }

        public override string ToString() {
            var str = new AsString(this);
            str.Append("class", FullName);
            str.Append("type", TypeNameFor());
            str.Append("persistable", Persistable);
            str.Append("superclass", innerSpec.Superclass == null ? "object" : innerSpec.Superclass.FullName);
            return str.ToString();
        }

        protected bool Equals(ObjectSpec other) {
            return Equals(innerSpec, other.innerSpec);
        }

        public override bool Equals(object obj) {
            if (ReferenceEquals(null, obj)) return false;
            if (ReferenceEquals(this, obj)) return true;
            if (obj.GetType() != GetType()) return false;
            return Equals((ObjectSpec)obj);
        }

        public override int GetHashCode() {
            return (innerSpec != null ? innerSpec.GetHashCode() : 0);
        }
    }
}

// Copyright (c) Naked Objects Group Ltd.