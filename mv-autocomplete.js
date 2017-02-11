/**
 * Input para utilizar cuando se requiera un campo con autocompletar
 * El input utiliza las funcionas propias de cada unidad funcional para obtener un array, el cual luego
 * filtra por los campos deseados y luego muestra los resultados en el formato que se desee.
 * El formato individual de cada columna de resultado, se debe dar, formateando los spans generados (uno por cada columna).
 */
(function () {
    'use strict';

    var scripts = document.getElementsByTagName("script");
    var currentScriptPath = scripts[scripts.length - 1].src;

    angular
        .module('mvAutocomplete', ['ngRoute'])
        .component('mvAutocomplete', {
            bindings: {
                searchFunction: '&',
                searchFields: '=',
                fieldsToShow: '=',
                selectedTo: '=',
                href: '=',
                exact: '=',
                clear: '<'
            },
            template: '' +
            '<input type="text" ' +
            'id="mv-autocomplete-{{$ctrl.id}}" ' +
            'ng-change="$ctrl.getList();" ' +
            'ng-model="$ctrl.searchText" autocomplete="off">',
            controller: MvAutocompleteController
        });


    MvAutocompleteController.$inject = ["$element", "$scope", "$compile", "$timeout", "MvUtils"];
    /**
     * @param searchFunction Función de búsqueda, siempre es una función que trae todo y se filtra dentro del componente
     * @param searchFields Campos por los cuales se debe realizar el filtro
     * @param fieldsToShow Campos a mostrar, si está vacío se muestra los campos de búsqueda
     * @param selectedTo Objeto seleccionado
     * @param href
     * @param exact default false, indica si se debe buscar el texto exacto o alguna ocurrencia
     * @param $http
     * @param $scope
     * @constructor
     */
    function MvAutocompleteController($element, $scope, $compile, $timeout, MvUtils) {
        var vm = this;

        $timeout(function(){
            // identificador único del scope dentro la vista
            vm.id = $scope.$id;

            console.log(vm.searchFields);
            console.log(vm.fieldsToShow);
            //vm.searchFields = "nombre";
            //vm.fieldsToShow = "nombre";

            vm.indexSelected = -1;
            vm.searchText = '';
            vm.cacheList = [];
            vm.filteredList = [];
            vm.camposAComparar = (vm.searchFields) ? vm.searchFields.split(',') : [];
            vm.camposAMostrar = (vm.fieldsToShow) ? vm.fieldsToShow.split(',') : [];
            vm.exacto = (vm.exact) ? vm.exact : false;
            vm.clear = (vm.clear) ? vm.clear : false;

            vm.getList = getList;
            vm.select = select;


            /**
             * Obtiene la lista completa de datos relacionados el input
             * Se ejecuta en el on-change del input
             */
            function getList() {

                // Si no está en el caché, la vuelvo a ejecutar, lo limpio al seleccionar uno de los resultados
                // TODO: No me convence que si los datos tienen cambio, esto no se entera
                //if (vm.cacheList == undefined || vm.cacheList.length == 0 || vm.clear) {

                vm.searchFunction({
                    callback: function (data) {
                        vm.cacheList = data;
                        filter();
                    }
                });
                //} else {

                //filter();
                //}
            }

            /**
             * Filtra los datos obtenidos
             */
            function filter() {
                if (vm.cacheList != undefined) {
                    vm.filteredList = [];
                    vm.cacheList.filter(function (e, i, a) {
                        vm.camposAComparar.forEach(function (elem, index, array) {
                            if (!vm.filteredList.hasOwnProperty(i)) {
                                if (e[elem] != null && ((vm.exacto && e[elem].toUpperCase() == vm.searchText.toUpperCase()) ||
                                    (!vm.exacto && e[elem].toUpperCase().indexOf(vm.searchText.toUpperCase()) > -1))) {
                                    return vm.filteredList[i] = e;
                                }
                            }
                        });
                    });
                    finish();
                }

            }


            /**
             * Muestra los datos y agrega funciones necesarias para selección, devolución y ocultación de paneles
             */
            function finish() {
                //console.log(vm.filteredList);
                var panel = document.getElementById("mv-autocomplete-panel-" + vm.id);

                if (panel != null) {
                    panel.remove();
                }

                var detalle = '';

                // Si la lista está vacía solamente devuelvo un vacío.
                if (vm.filteredList.length > 0 && vm.searchText.trim().length > 0) {
                    // Genero el detalle a partir de la lista filtrada
                    vm.filteredList.forEach(function (e, i, a) {
                        detalle = detalle +
                            '<li id="mv-autocomplete-li-' + i + '" ng-click="$ctrl.select(' + i + ')" ' +
                            'ng-mouseover="$ctrl.select(' + i + ', $event)" ' +
                            'ng-class="{\'mv-autocomplete-selected\':$ctrl.indexSelected==\'' + i + '\'}">';
                        vm.camposAMostrar.forEach(function (elem, index, array) {
                            if (elem.indexOf('[') > -1) {
                                var subElems = elem.split('.');
                                var indice = subElems[0].replace(']', '').substr(elem.indexOf('[') + 1);
                                var mainElem = subElems[0].substr(0, elem.indexOf('['));

                                detalle = detalle + '<span>' + e[mainElem][indice][subElems[1]] + '</span> '
                            } else {
                                detalle = detalle + '<span>' + e[elem] + '</span> '
                            }
                        });
                        detalle = detalle + '</li>';
                    });
                    // Lo agrego luego de la instancia del componente
                    $element.append($compile('<ul class="mv-autocomplete-panel" id="mv-autocomplete-panel-' + vm.id + '">' + detalle + '</ul>')($scope));

                    select(Object.keys(vm.filteredList)[0]);
                } else {
                    select(-1);
                }


            }

            /**
             * Paso al objeto del controlador padre, el objeto seleccionado y actualizo el indice
             * @param index
             */
            function select(index, event) {
                $timeout(function () {
                    if (index == -1) {
                        vm.selectedTo = {};
                    } else {

                        vm.selectedTo = angular.copy(vm.filteredList[index]);


                        // arreglo para que el scroll se mueva con el foco
                        // no se ejecuta en el mouse over, solo este evento envía el event.
                        if (event == undefined) {
                            var lu = angular.element(document.querySelector('#mv-autocomplete-panel-' + vm.id));

                            var he = 0;
                            var encontrado = false;
                            if (lu[0] != undefined) {
                                for (var i = 0; i < lu[0].childNodes.length; i++) {
                                    //if (lu[0].childNodes[i].className == 'mv-autocomplete-selected') {
                                    if (lu[0].childNodes[i].id.split('-')[3] == index) {
                                        encontrado = i;
                                        break;
                                    } else {
                                        encontrado = -1;
                                    }
                                }
                                for (var i = 0; i < encontrado; i++) {
                                    he = he + lu[0].childNodes[i].getBoundingClientRect().height;
                                }

                                if (encontrado == -1) {
                                    lu[0].scrollTop = 0;
                                } else {
                                    lu[0].scrollTop = he;
                                }
                            }
                        }

                        // fin arreglo scroll

                    }
                    vm.indexSelected = index;


                }, 0);


            }

            /**
             * Agrego funcionalidad para cuando se va del control
             */
            $element.children().bind('blur', function () {
                onLeave();
            });


            /**
             * Agrego funcionalidad para keyup y focus
             */
            $element.bind('keyup focus', function (event) {
                // Me muevo para abajo en la lista
                if (event.keyCode == 40) {

                    var index = getIndex(vm.indexSelected);
                    vm.indexSelected = (index.nextIndex == undefined) ? index.firstIndex : index.nextIndex;
                    select(vm.indexSelected);
                    moveCursorToEnd();
                }

                // Me muevo para arriba en la lista
                if (event.keyCode == 38) {

                    var index = getIndex(vm.indexSelected);
                    vm.indexSelected = (index.prevIndex == undefined) ? index.lastIndex : index.prevIndex;
                    select(vm.indexSelected);
                    moveCursorToEnd();
                }


                // selecciono
                if (event.keyCode == 13) {
                    onLeave()
                }


            });

            /**
             * Función asociada al Enter y al abandonar el control. Actualiza la información y remueve el panel.
             */
            function onLeave() {
                if (vm.searchText == undefined || vm.searchText.trim().length == 0 || vm.filteredList.length == 0) {
                    select(-1);
                } else {
                    select(vm.indexSelected);
                    vm.searchText = vm.selectedTo[vm.camposAMostrar[0]];
                }

                var panel = document.getElementById("mv-autocomplete-panel-" + vm.id);
                if (panel != null) {
                    panel.remove();
                }
            }

            /**
             * muevo siempre el cursor al final el input, solo para comodidad del usuario
             */
            function moveCursorToEnd() {
                var tmp = vm.searchText;
                vm.searchText = '';
                $timeout(function () {
                    vm.searchText = tmp;
                }, 0);
            }

            /**
             * función auxiliar para obtener el index del array de resultados, esto hay que hacerlo ya que
             * javascript no soporta agregar nombre de propiedad y además index numérico.
             * @param prop
             * @returns {{nextIndex: *, prevIndex: *, firstIndex: *, lastIndex: *}}
             */
            function getIndex(prop) {
                var listaProps = Object.keys(vm.filteredList);
                var actualIndex = listaProps.indexOf(prop);
                var nextIndex = listaProps[actualIndex + 1];
                var prevIndex = listaProps[actualIndex - 1];
                var firstIndex = listaProps[0];
                var lastIndex = listaProps[listaProps.length - 1];
                return {nextIndex: nextIndex, prevIndex: prevIndex, firstIndex: firstIndex, lastIndex: lastIndex};
            }
        },100);

    }

})();
