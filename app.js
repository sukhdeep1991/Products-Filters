"use strict";
(function(){
    function Deffered () {
        var successCallback, errorCallback;
        this.promise = {
            then: function(sb, eb){
                successCallback = sb;
                errorCallback = eb;
            }
        };

        this.resolve = function(data){
            if(successCallback && typeof successCallback === "function"){
                successCallback(data);
            }
        };

        this.reject = function(data){
            if(errorCallback && typeof errorCallback === "function") {
                errorCallback(data);
            }
        };

        this.when = function(data){
            var self = this;
            setTimeout(function(){
                self.resolve(data);
            });
            return self.promise;
        };
    }

    function makeRequest(url){
        var deffered = new Deffered(),
        xhr = new XMLHttpRequest(),
        DONE = 4, // readyState 4 means the request is done.
        OK = 200; // status 200 is a successful return.
        
        xhr.open('GET', url);
        xhr.send(null);
        xhr.onreadystatechange = function(){
            if (xhr.readyState === DONE) {
                if (xhr.status === OK) {
                    var parsedResponse;
                    try {
                        parsedResponse = JSON.parse(xhr.responseText);
                    } catch (err) {
                        console.error(err);
                        deffered.reject("Error Parsing the response");
                    }
                    deffered.resolve(parsedResponse);
                } else {
                    deffered.reject(xhr.status);      
                }
            } 
        };
        return deffered.promise;
    }
    
    var products = null;
    function getProducts() {
        var deffered = new Deffered();
        if(products) {
            return deffered.when(products);
        }
        makeRequest("http://flipkart.mockable.io/products")
        .then(function(response){
            products = response.products;
            if(products && products.forEach) {
                products.forEach(function(product, index){
                    product.relevanceIndex = index;
                });
            }
            deffered.resolve(products);
        }, deffered.reject);

        return deffered.promise;
    }

    var filters = null;
    function getFilters() {
        var deffered = new Deffered();
        if(filters) {
            return deffered.when(filters);
        }
        makeRequest("http://flipkart.mockable.io/filters")
        .then(function(response){
            filters = response.filters;
            deffered.resolve(filters);
        }, deffered.reject);

        return deffered.promise;
    }

    window.onload = function() {
        var productDetailsTemplate = document.getElementById("product-details-template"),
        filterTypePrice = "PRICE", filterTypeColor = "COLOUR",
        minPriceDropdown = document.getElementById("min-price-select"),
        maxPriceDropdown = document.getElementById("max-price-select"),
        colorList = document.getElementById("color-checkbox-list");
        //Make request for products
        getProducts().then(function(products){
            renderProducts(products);
        }, function(){
            //Can improve to show some toaster to the user
            alert("Error occured while fetching the products");
        });

        //Render filters
        getFilters().then(function(filters){
            if(filters && filters.forEach) {
                filters.forEach(function(filter) {
                    if(filter.type === filterTypePrice) {
                        renderPriceFilter(filter.values);
                    } else if(filter.type === filterTypeColor) {
                        renderColorFilter(filter.values);
                    }
                    bindFilterChanges();
                });
            }
        }, function(){
            alert("Error occured while fetching the filters");
        });

        function renderProducts(products) {
            var listHTML = "", productHTML = productDetailsTemplate.innerHTML,
            resultsInfo = document.getElementById("result-info");
            if(products && products.forEach) {
                products.forEach(function(product){
                    listHTML += productHTML.replace(/{{image}}/g, product.image)
                                            .replace(/{{title}}/g, product.title)
                                            .replace(/{{rating}}/g, product.rating)
                                            .replace(/{{finalPrice}}/g, product.price.final_price)
                                            .replace(/{{mrp}}/g, product.price.mrp || "")
                                            .replace(/{{discount}}/g, product.discount > 0 ? (product.discount+"%") : "");

                });
            }
            document.getElementById("product-list").innerHTML = listHTML;
            if(listHTML !== "") {
                resultsInfo.innerHTML = 'Showing '+ products.length + ' results for "shoes"';
            } else {
                resultsInfo.innerHTML = 'No results found.';
            }
        }

        function renderPriceFilter(priceValues) {
            var optionsHTML = "";
            if(priceValues && priceValues.forEach) {
                priceValues.forEach(function(priceValue){
                    var option = document.createElement("option");
                    option.text = priceValue.displayValue;
                    option.value = priceValue.key;

                    optionsHTML += option.outerHTML;
                });
            }
            minPriceDropdown.innerHTML = optionsHTML;
            maxPriceDropdown.innerHTML = optionsHTML;
            //Select the max price value first
            if(priceValues && priceValues.length > 1){
                maxPriceDropdown.value = priceValues[priceValues.length-1].key;
            }
        }

        function renderColorFilter(colorValues) {
            var checkboxesOptions = "", checkboxTemplate = document.getElementById("color-checkbox-template").innerHTML;
            if(colorValues && colorValues.forEach) {
                colorValues.forEach(function(colorValue) {
                    checkboxesOptions += checkboxTemplate.replace(/{{title}}/g, colorValue.title)
                                                        .replace(/{{colorCode}}/g, colorValue.color);
                });
            }
            colorList.innerHTML = checkboxesOptions;
        }

        function bindFilterChanges() {
            minPriceDropdown.onchange = applyFiltersAndRenderProducts;
            maxPriceDropdown.onchange = applyFiltersAndRenderProducts;

            colorList.onclick = applyFiltersAndRenderProducts;

            document.getElementById("relevance-sort").onclick = function(){
                applySortAndRenderProducts("relevanceIndex", "asc");
            };
            document.getElementById("price-low-sort").onclick = function(){
                applySortAndRenderProducts("price.final_price", "asc");
            };
            document.getElementById("price-high-sort").onclick = function(){
                applySortAndRenderProducts("price.final_price", "desc");
            };
        }

        function getSanitizedPriceValue(price) {
            if(price === "Min") {
                return 0;
            } else if(price === "Max") {
                return 4001;
            } else if(isNaN(price)) {
                return 0;
            }
            return parseInt(price, 10);
        }

        function applySortAndRenderProducts(sortBy, sortOrder) {
            //getProducts().then(function(products) {
                //renderProducts(products.sort(function(){}));
            //});
        }

        function applyFiltersAndRenderProducts() {
            var filterVals = {
                minPrice: getSanitizedPriceValue(minPriceDropdown.value),
                maxPrice: getSanitizedPriceValue(maxPriceDropdown.value),
                colors: []
            };
            //Fill out the colors
            var checkboxes = colorList.getElementsByTagName("input");
            for(let i = 0 ; i < checkboxes.length ; i++){
                if(checkboxes[i].checked) {
                    filterVals.colors.push(checkboxes[i].value);
                }
            }

            //Get the products and filter them
            getProducts().then(function(products) {
                var filteredProducts = products.filter(function(product){
                    return product.price.final_price >= filterVals.minPrice &&
                    product.price.final_price <= filterVals.maxPrice &&
                    (filterVals.colors.length === 0 ||
                            filterVals.colors.indexOf(product.colour.color) > -1);
                });

                renderProducts(filteredProducts);
            });
        }
    };
})();