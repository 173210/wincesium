OBJS := Cesium node_modules index.js package.json	\
	viewer.css viewer.html viewer.js winm1.png

all: $(addprefix out/, $(OBJS))
	electron-packager out --ignore='/node_modules($$|/)' '--app-copyright=Copyright © 173210 <root.3.173210@live.com>' --app-version=0.0.1 --app-category-type=public.app-category.productivity '--version-string.FileDescription=九州大学大学院理学研究院 地震火山観測研究センター 地震データを地図上に表示するツール' --version-string.OriginalFileName=wincesium.exe --version-string.ProductName=WinCesium --version-string.InternalName=wincesium $(PACKERFLAGS)

out/Cesium: node_modules/cesium/Build/Cesium | out
	cp -Rf $< $@

out/node_modules: | out
	ln -s ../node_modules $@

out/viewer.js: viewer.js
	@echo 'sed s/BING_KEY/\"$$(BING_KEY)\"/ $< > $@'
	@sed s/BING_KEY/\"$(BING_KEY)\"/ $< > $@

out/%: %
	cp -Rf $< $@

out:
	mkdir -p $@
