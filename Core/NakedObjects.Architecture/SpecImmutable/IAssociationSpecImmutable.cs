// Copyright Naked Objects Group Ltd, 45 Station Road, Henley on Thames, UK, RG9 1AT
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and limitations under the License.

namespace NakedObjects.Architecture.SpecImmutable {
    /// <summary>
    ///     Additional reflective details about field members
    /// </summary>
    public interface IAssociationSpecImmutable : IMemberSpecImmutable {
        /// <summary>
        ///     If this is a scalar association, representing (in old terminology)
        ///     a reference to another entity or a value.
        /// </summary>
        /// <para>
        ///     Opposite of <see cref="IsOneToMany" />
        /// </para>
        bool IsOneToOne { get; }

        /// <summary>
        ///     If this is a collection
        /// </summary>
        /// <para>
        ///     Opposite of <see cref="IsOneToOne" />
        /// </para>
        bool IsOneToMany { get; }
    }

    // Copyright (c) Naked Objects Group Ltd.
}